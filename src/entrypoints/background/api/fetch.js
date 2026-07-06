import {
	mapDataToInternalFormat,
	createPullRequestsQuery,
	createMyPullRequestsQuery,
	MY_PULL_REQUEST_RELATIONSHIPS,
	transferUserStatus,
	autoRemoveRepo,
} from './index.js';
import { sendToAllTabs } from '../lib/communication';
import { quickStorage } from '../settings/';
import { mapUnauthorizedDataToInternalFormat } from './mapping.js';
export let apiErrors = {
	_errors: [],
	get() {
		return this._errors;
	},
	set(newErrors) {
		this._errors = newErrors;
	},
	push(newErrors) {
		this._errors.push(...newErrors);
	},
};

// This function is a fire and forget function
// that handles all internal erros by it self.
// No callerfunction relies on the returned data from this function
// TODO: Rename function to other than fetchDdata?? getRepoData?
export async function fetchData() {
	try {
		const settings = await quickStorage.getSettings();
		if (!settings) {
			return;
		}

		let newRepoData;
		let rateLimit;
		if (settings.token) {
			// Show loadinganimation when we are fetching data
			sendToAllTabs({
				loading: true,
			});

			let { rateLimit: tmpRateLimit, ...restData } =
				await fetchDataFromAPI(settings);
			// Assign to variable in outer scope
			rateLimit = tmpRateLimit;
			newRepoData = await mapDataToInternalFormat(restData);

			// If we dont have a token, then we will not get data from github api
			// Instead we will load a basic setup of the repos the user has added
		} else {
			newRepoData = mapUnauthorizedDataToInternalFormat(settings.repos);
		}

		// Transfer read and collapsed-status from old repositories
		const repositories = await transferUserStatus(newRepoData);

		// Save and distribute
		quickStorage.setRepositories(repositories);
		quickStorage.setRateLimit(rateLimit);
		const errors = apiErrors.get();
		sendToAllTabs({
			repositories,
			rateLimit,
			...(errors.length > 0 ? { errors } : {}),
			loading: false,
		});
	} catch (err) {
		if (!err) {
			return;
		}

		apiErrors.push(err);

		sendToAllTabs({
			errors: apiErrors.get(),
			loading: false,
		});
	}
}

function normalizeGraphQLErrors(
	errors,
	{ autoRemoveMissingRepo = false } = {},
) {
	return errors.map((item) => {
		if (autoRemoveMissingRepo && item.type === 'NOT_FOUND') {
			// Repos are named 'repo{number}' in GraphQL calls
			const missingRepoNumber = Number(item.path[0].replace('repo', ''));

			autoRemoveRepo(missingRepoNumber);

			return {
				title: 'Error in API query to Github',
				message: `${item.message}: Will now autoremove repo from list.`,
				time: Date.now(),
			};
		}

		return {
			title: 'Error in API query to Github',
			message: item.message,
			time: Date.now(),
		};
	});
}

async function fetchGraphQL(token, query, options = {}) {
	const res = await fetch('https://api.github.com/graphql', {
		method: 'post',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ query }),
	});

	const result = await res.json();
	if (result.errors) {
		throw normalizeGraphQLErrors(result.errors, options);
	}
	if (!result.data) {
		throw [
			{
				title: 'Could not reach Githubs API at this moment',
				message: result.message || 'Unknown error',
				time: Date.now(),
			},
		];
	}

	return result.data;
}

function createRepoUrl({ owner, name }) {
	return `https://github.com/${owner}/${name}`;
}

function getRepoUrlFromPullRequest(node) {
	const match = node.url.match(
		/^(https:\/\/github\.com\/[^/]+\/[^/]+)\/pull\/\d+/,
	);
	return match ? match[1] : null;
}

function sortAndLimitPullRequests(pullRequests, numberOfItems, sortBy) {
	const dateField = sortBy === 'UPDATED_AT' ? 'updatedAt' : 'createdAt';
	return [...pullRequests]
		.sort((a, b) => new Date(b[dateField]) - new Date(a[dateField]))
		.slice(0, numberOfItems);
}

async function fetchMyPullRequestsFromAPI({
	token,
	repos,
	numberOfItems,
	sortBy,
}) {
	const resultsByRepo = repos.reduce((result, repo) => {
		result[createRepoUrl(repo)] = [];
		return result;
	}, {});

	for (const repo of repos) {
		const dedupedByRepo = {};

		for (const relationship of MY_PULL_REQUEST_RELATIONSHIPS) {
			let afterCursor = null;
			let hasNextPage = true;

			while (hasNextPage) {
				const data = await fetchGraphQL(
					token,
					createMyPullRequestsQuery(
						repo,
						relationship,
						numberOfItems,
						afterCursor,
					),
				);
				const searchData = data.search || {};
				const { nodes = [], pageInfo = {} } = searchData;

				nodes.filter(Boolean).forEach((node) => {
					const repoUrl =
						getRepoUrlFromPullRequest(node) || createRepoUrl(repo);
					dedupedByRepo[repoUrl] = dedupedByRepo[repoUrl] || {};
					dedupedByRepo[repoUrl][node.id] = node;
				});

				const repoUrl = createRepoUrl(repo);
				const enoughItems =
					Object.keys(dedupedByRepo[repoUrl] || {}).length >= numberOfItems;
				hasNextPage = !enoughItems && (pageInfo.hasNextPage || false);
				afterCursor = pageInfo.endCursor;
			}
		}

		Object.entries(dedupedByRepo).forEach(([repoUrl, pullRequestsById]) => {
			const existingPullRequests = resultsByRepo[repoUrl] || [];
			const mergedPullRequests = existingPullRequests.reduce((merged, item) => {
				merged[item.id] = item;
				return merged;
			}, {});

			Object.values(pullRequestsById).forEach((item) => {
				mergedPullRequests[item.id] = item;
			});

			resultsByRepo[repoUrl] = sortAndLimitPullRequests(
				Object.values(mergedPullRequests),
				numberOfItems,
				sortBy,
			);
		});
	}

	return resultsByRepo;
}

async function fetchDataFromAPI({ token, repos, numberOfItems, sortBy }) {
	if (!numberOfItems) {
		return Promise.reject();
	}

	const query = createPullRequestsQuery(repos, numberOfItems, sortBy);

	try {
		const data = await fetchGraphQL(token, query, {
			autoRemoveMissingRepo: true,
		});
		let myPullRequestsByRepo = {};
		try {
			myPullRequestsByRepo = await fetchMyPullRequestsFromAPI({
				token,
				repos,
				numberOfItems,
				sortBy,
			});
		} catch (error) {
			storePersonalPullRequestError(error);
		}

		return {
			...data,
			myPullRequestsByRepo,
		};
	} catch (error) {
		// If we dont have a error resonse, its probably a network error.
		// We dont want to flood users with network errors
		if (!error.response) {
			if (Array.isArray(error)) {
				return Promise.reject(error);
			}

			return Promise.reject();
		}

		const userError = [
			{
				title: error.message,
				message: error.response.data.message,
				time: Date.now(),
			},
		];

		return Promise.reject(userError);
	}
}

function storePersonalPullRequestError(error) {
	if (Array.isArray(error)) {
		apiErrors.push(error);
		return;
	}

	if (!error.response) {
		return;
	}

	apiErrors.push([
		{
			title: error.message,
			message: error.response.data.message,
			time: Date.now(),
		},
	]);
}
