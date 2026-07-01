# My Pull Requests Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stable `My pull requests` section to each expanded repository so the logged-in user can see open PRs they authored, are assigned to, or are requested to review.

**Architecture:** Keep the existing repository GraphQL query for the general sidebar data. Add a focused authenticated GitHub search fetch path for personal pull requests, map results into `repo.myPullRequests`, and render that array with the existing PR item UI above the general `Pull requests` section.

**Tech Stack:** WXT browser extension, React 19, Chrome extension APIs, GitHub GraphQL API, Vitest, Testing Library.

## Global Constraints

- Keep the extension copy in English.
- Do not add a settings checkbox or mode selector in the first version.
- Do not deduplicate pull requests between `My pull requests` and `Pull requests`.
- Do not change issue behavior.
- Do not change the existing general pull request count or `numberOfItems` setting.
- Do not add support for unauthenticated personal pull request discovery.
- `My pull requests` must render with a count even when it has zero items whenever pull request sections are visible.
- Personal pull request fetch failures must not block existing issue/general pull request refreshes.
- Do not stage or commit the spec or plan documents; they are working notes for this session.

---

## File Structure

- Modify `src/entrypoints/background/api/graphql.js`
  - Add a query builder for GitHub Search API GraphQL requests that fetch personal PRs with `author:@me`, `assignee:@me`, and `review-requested:@me`.
- Modify `src/entrypoints/background/api/index.js`
  - Export the new query builder.
- Modify `src/entrypoints/background/api/fetch.js`
  - Add a personal PR fetch path after the main repository fetch.
  - Merge personal PR results into the data passed to mapping.
- Modify `src/entrypoints/background/api/mapping.js`
  - Add `myPullRequests` to the repository data model.
  - Map GraphQL search nodes to the same internal item shape as existing PRs.
- Modify `src/entrypoints/background/api/transfer.js`
  - Transfer read status for `myPullRequests`.
- Modify `src/entrypoints/background/lib/index.js`
  - Toggle and browser-navigation read state for `myPullRequests`.
- Modify `src/entrypoints/github.content/utils/utils.js`
  - Include `myPullRequests` in unread detection.
- Modify `src/entrypoints/github.content/components/Repositories/type.jsx`
  - Generalize display metadata for `myPullRequests`.
- Modify `src/entrypoints/github.content/components/Repositories/repository.jsx`
  - Render `myPullRequests` between `issues` and `pullRequests` when pull request sections are visible.
- Modify `test/generate.js`
  - Add fixtures for personal PR search results and `myPullRequests`.
- Update tests under:
  - `src/entrypoints/background/api/__tests__/graphql.test.js`
  - `src/entrypoints/background/api/__tests__/fetch.test.js`
  - `src/entrypoints/background/api/__tests__/transfer.test.js`
  - `src/entrypoints/background/lib/__tests__/index.test.js`
  - `src/entrypoints/github.content/__tests__/app.test.js`
  - `src/entrypoints/github.content/utils/__tests__/utils.test.js`

---

### Task 1: Add Personal PR Query Builder

**Files:**
- Modify: `src/entrypoints/background/api/graphql.js`
- Modify: `src/entrypoints/background/api/index.js`
- Test: `src/entrypoints/background/api/__tests__/graphql.test.js`

**Interfaces:**
- Produces: `createMyPullRequestsQuery(repo, relationship, afterCursor)`
- `repo`: `{ owner: string, name: string }`
- `relationship`: one of `'author'`, `'assignee'`, `'review-requested'`
- `afterCursor`: `string | null`
- Returns: GraphQL query string containing a single `search(type: ISSUE, first: 100, after: ...)` field.

- [ ] **Step 1: Write failing query-builder tests**

Add tests that assert the personal PR search query contains:

```js
repo:githubusername/reponame is:pr is:open author:@me
repo:githubusername/reponame is:pr is:open assignee:@me
repo:githubusername/reponame is:pr is:open review-requested:@me
```

Also assert that `afterCursor` renders as `after: null` when absent and as `after: "abc123"` when present.

Use this test shape:

```js
it('should create personal pull request search queries', () => {
	const repo = { owner: 'githubusername', name: 'reponame' };

	expect(createMyPullRequestsQuery(repo, 'author')).toContain(
		'query: "repo:githubusername/reponame is:pr is:open author:@me"',
	);
	expect(createMyPullRequestsQuery(repo, 'assignee')).toContain(
		'query: "repo:githubusername/reponame is:pr is:open assignee:@me"',
	);
	expect(createMyPullRequestsQuery(repo, 'review-requested')).toContain(
		'query: "repo:githubusername/reponame is:pr is:open review-requested:@me"',
	);
	expect(createMyPullRequestsQuery(repo, 'author')).toContain('after: null');
	expect(createMyPullRequestsQuery(repo, 'author', 'abc123')).toContain(
		'after: "abc123"',
	);
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/graphql.test.js`

Expected before implementation: FAIL because `createMyPullRequestsQuery` is not exported.

- [ ] **Step 3: Implement the query builder**

Add to `graphql.js`:

```js
export const MY_PULL_REQUEST_RELATIONSHIPS = [
	'author',
	'assignee',
	'review-requested',
];

export function createMyPullRequestsQuery(repo, relationship, afterCursor = null) {
	const after = afterCursor ? `"${afterCursor}"` : null;
	const query = `repo:${repo.owner}/${repo.name} is:pr is:open ${relationship}:@me`;

	return `query {
            search(query: "${query}", type: ISSUE, first: 100, after: ${after}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                ... on PullRequest {
                  id
                  title
                  url
                  updatedAt
                  createdAt
                  number
                  author {
                    login
                  }
                  reviews(last: 1, states: [APPROVED, CHANGES_REQUESTED, DISMISSED]) {
                    nodes {
                      state
                    }
                  }
                  comments {
                    totalCount
                  }
                }
              }
            }
          }`;
}
```

Export it from `api/index.js`:

```js
export {
	createPullRequestsQuery,
	createMyPullRequestsQuery,
	MY_PULL_REQUEST_RELATIONSHIPS,
} from './graphql';
```

- [ ] **Step 4: Run the query-builder test**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/graphql.test.js`

Expected after implementation: PASS for the new tests. Snapshot updates may be needed only if imports or existing query output changes.

---

### Task 2: Fetch Personal PRs With Pagination

**Files:**
- Modify: `src/entrypoints/background/api/fetch.js`
- Test: `src/entrypoints/background/api/__tests__/fetch.test.js`
- Modify fixtures: `test/generate.js`

**Interfaces:**
- Consumes: `createMyPullRequestsQuery(repo, relationship, afterCursor)`
- Consumes: `MY_PULL_REQUEST_RELATIONSHIPS`
- Produces: `fetchMyPullRequestsFromAPI({ token, repos })`
- Returns: object keyed by repository URL, where each value is an array of raw GraphQL `PullRequest` nodes.

- [ ] **Step 1: Add personal PR fixtures**

In `test/generate.js`, add:

```js
export function createExternalMyPullRequestsResponse({
	hasNextPage = false,
	endCursor = null,
	nodes = [createExternalPullRequestNode({ id: 'myPullID' })],
} = {}) {
	return {
		data: {
			search: {
				pageInfo: {
					hasNextPage,
					endCursor,
				},
				nodes,
			},
		},
	};
}

export function createExternalPullRequestNode({
	id = 'myPullID',
	title = 'My Pull title 1',
	url = createRepoURL({ subPath: '/pull/22' }),
	author = defaultUserName,
	comments = 5,
	reviewStatus = 'CHANGES_REQUESTED',
	createdAt = date,
	updatedAt = date,
	number = 22,
} = {}) {
	return {
		id,
		title,
		url,
		updatedAt,
		createdAt,
		number,
		author: {
			login: author,
		},
		reviews: {
			nodes: reviewStatus ? [{ state: reviewStatus }] : [],
		},
		comments: {
			totalCount: comments,
		},
	};
}
```

If `date` is not exportable, keep these helpers in the same module so they can use the existing local `date` constant.

- [ ] **Step 2: Write failing fetch tests**

Add tests that mock multiple `fetch` calls:

```js
it('should fetch personal pull requests for each repo and relationship', async () => {
	const mainResponse = createExternalRespositories();
	const personalResponse = createExternalMyPullRequestsResponse();
	global.fetch = vi
		.fn()
		.mockResolvedValueOnce({ json: () => Promise.resolve(mainResponse) })
		.mockResolvedValue({ json: () => Promise.resolve(personalResponse) });

	await fetchData();

	expect(global.fetch).toHaveBeenCalledTimes(1 + createSettings().repos.length * 3);
	const repositories = sendToAllTabs.mock.calls[1][0].repositories;
	expect(repositories[0].myPullRequests).toHaveLength(1);
	expect(repositories[0].myPullRequests[0].id).toBe('myPullID');
});

it('should fetch the next personal pull request page when search has more pages', async () => {
	const mainResponse = createExternalRespositories(1);
	const firstPage = createExternalMyPullRequestsResponse({
		hasNextPage: true,
		endCursor: 'cursor-1',
		nodes: [createExternalPullRequestNode({ id: 'myPullID' })],
	});
	const secondPage = createExternalMyPullRequestsResponse({
		nodes: [createExternalPullRequestNode({ id: 'myPullID_2' })],
	});
	global.fetch = vi
		.fn()
		.mockResolvedValueOnce({ json: () => Promise.resolve(mainResponse) })
		.mockResolvedValueOnce({ json: () => Promise.resolve(firstPage) })
		.mockResolvedValue({ json: () => Promise.resolve(secondPage) });

	await fetchData();

	const repositories = sendToAllTabs.mock.calls[1][0].repositories;
	expect(repositories[0].myPullRequests.map((item) => item.id)).toEqual([
		'myPullID',
		'myPullID_2',
	]);
});
```

- [ ] **Step 3: Run the failing fetch tests**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/fetch.test.js`

Expected before implementation: FAIL because personal PRs are not fetched or mapped.

- [ ] **Step 4: Implement personal fetch helpers**

In `fetch.js`, import the query helpers:

```js
import {
	mapDataToInternalFormat,
	createPullRequestsQuery,
	createMyPullRequestsQuery,
	MY_PULL_REQUEST_RELATIONSHIPS,
	transferUserStatus,
	autoRemoveRepo,
} from './index.js';
```

Add helpers:

```js
async function fetchGraphQL(token, query) {
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
		throw result.errors.map((item) => ({
			title: 'Error in API query to Github',
			message: item.message,
			time: Date.now(),
		}));
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

function repoKey(repo) {
	return `https://github.com/${repo.owner}/${repo.name}`;
}

async function fetchMyPullRequestsFromAPI({ token, repos }) {
	const resultsByRepo = {};

	for (const repo of repos) {
		const deduped = {};

		for (const relationship of MY_PULL_REQUEST_RELATIONSHIPS) {
			let afterCursor = null;
			let hasNextPage = true;

			while (hasNextPage) {
				const data = await fetchGraphQL(
					token,
					createMyPullRequestsQuery(repo, relationship, afterCursor),
				);
				const { nodes, pageInfo } = data.search;
				nodes.filter(Boolean).forEach((node) => {
					deduped[node.id] = node;
				});
				hasNextPage = pageInfo.hasNextPage;
				afterCursor = pageInfo.endCursor;
			}
		}

		resultsByRepo[repoKey(repo)] = Object.values(deduped);
	}

	return resultsByRepo;
}
```

Refactor `fetchDataFromAPI` to use `fetchGraphQL` for the existing main query, then fetch personal PRs and return them:

```js
async function fetchDataFromAPI({ token, repos, numberOfItems, sortBy }) {
	if (!numberOfItems) {
		return Promise.reject();
	}

	const query = createPullRequestsQuery(repos, numberOfItems, sortBy);
	const data = await fetchGraphQL(token, query);
	const myPullRequestsByRepo = await fetchMyPullRequestsFromAPI({ token, repos });

	return {
		...data,
		myPullRequestsByRepo,
	};
}
```

Keep the existing `NOT_FOUND` auto-remove behavior in the main query error path. If extracting `fetchGraphQL` removes that branch, preserve it by passing an option such as `{ autoRemoveMissingRepo: true }` for the main query and checking `item.type === 'NOT_FOUND'` there.

- [ ] **Step 5: Run fetch tests**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/fetch.test.js`

Expected after implementation: new personal PR fetch assertions pass and existing error tests still pass.

---

### Task 3: Map `myPullRequests` Into Repository Data

**Files:**
- Modify: `src/entrypoints/background/api/mapping.js`
- Test: `src/entrypoints/background/api/__tests__/fetch.test.js`
- Modify fixtures: `test/generate.js`

**Interfaces:**
- Consumes: `myPullRequestsByRepo` from `fetchDataFromAPI`
- Produces: `repo.myPullRequests: Array<InternalItem>`

- [ ] **Step 1: Write failing mapping expectations**

Extend the fetch test's `should return repo data` assertion:

```js
expect(firstRepo.myPullRequests).toEqual([]);
```

Add a new test for mapped personal PRs:

```js
it('should map personal pull requests into each repository', async () => {
	const mainResponse = createExternalRespositories(1);
	const personalResponse = createExternalMyPullRequestsResponse({
		nodes: [
			createExternalPullRequestNode({
				id: 'myPullID',
				title: 'My assigned PR',
				author: 'anotherAuthor',
				reviewStatus: null,
			}),
		],
	});
	global.fetch = vi
		.fn()
		.mockResolvedValueOnce({ json: () => Promise.resolve(mainResponse) })
		.mockResolvedValue({ json: () => Promise.resolve(personalResponse) });

	await fetchData();

	expect(sendToAllTabs.mock.calls[1][0].repositories[0].myPullRequests).toEqual([
		{
			author: 'anotherAuthor',
			comments: 5,
			createdAt: '2021-01-01T01:02:03Z',
			id: 'myPullID',
			read: false,
			reviewStatus: null,
			title: 'My assigned PR',
			updatedAt: '2021-01-01T01:02:03Z',
			url: 'https://github.com/githubusername/github-sidebar/pull/22',
		},
	]);
});
```

- [ ] **Step 2: Run the failing mapping tests**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/fetch.test.js`

Expected before implementation: FAIL because `myPullRequests` is missing.

- [ ] **Step 3: Extract item mapping and add `myPullRequests`**

In `mapping.js`, change the function signature:

```js
export async function mapDataToInternalFormat(data) {
	const { viewer, myPullRequestsByRepo = {}, ...repos } = data;
```

Extract the item mapping from `listItems`:

```js
function mapNodeToInternalItem(item, { login }, totalItemNumber) {
	return {
		id: item.id,
		title: item.title,
		url: item.url,
		reviewStatus:
			item.reviews && item.reviews.nodes.length > 0
				? item.reviews.nodes[0].state
				: null,
		updatedAt: item.updatedAt,
		createdAt: item.createdAt,
		comments: item.comments.totalCount,
		read: setItemReadStatus(item, login, totalItemNumber),
		author: item.author.login,
	};
}

function listItems(element, viewer, totalItemNumber) {
	return element.edges.map(({ node: item }) =>
		mapNodeToInternalItem(item, viewer, totalItemNumber),
	);
}
```

When creating each repo:

```js
const myPullRequests = (myPullRequestsByRepo[repo.url] || []).map((item) =>
	mapNodeToInternalItem(item, viewer, oldTotalItemsNumber),
);

return createRepoData(
	repo,
	issues,
	pullRequests,
	myPullRequests,
	newTotalItemsNumber,
);
```

Update `createRepoData`:

```js
function createRepoData(
	repo,
	issues = [],
	pullRequests = [],
	myPullRequests = [],
	newTotalItemsNumber,
) {
	// existing body
	return {
		name,
		owner,
		url: repo.url || createGithubUrl(owner, name),
		collapsed: true,
		totalItemsNumber: newTotalItemsNumber,
		totalItems: {
			issues: repo.issues?.totalCount,
			pullRequests: repo.pullRequests?.totalCount,
		},
		issues,
		myPullRequests,
		pullRequests,
	};
}
```

Update `mapUnauthorizedDataToInternalFormat` so unauthenticated repos also get `myPullRequests: []`.

- [ ] **Step 4: Run mapping tests**

Run: `npm run test:once -- src/entrypoints/background/api/__tests__/fetch.test.js`

Expected after implementation: PASS for mapped personal PRs and existing repository snapshots updated with `myPullRequests: []`.

---

### Task 4: Preserve Read State Across All Personal PR Flows

**Files:**
- Modify: `src/entrypoints/background/api/transfer.js`
- Modify: `src/entrypoints/background/lib/index.js`
- Modify: `src/entrypoints/github.content/utils/utils.js`
- Test: `src/entrypoints/background/api/__tests__/transfer.test.js`
- Test: `src/entrypoints/background/lib/__tests__/index.test.js`
- Test: `src/entrypoints/github.content/utils/__tests__/utils.test.js`

**Interfaces:**
- Consumes: `repo.myPullRequests`
- Produces: consistent read/unread behavior for single-item, repo-level, all-repo, browser-navigation, and favicon unread checks.

- [ ] **Step 1: Write failing read-state tests**

In `transfer.test.js`, add:

```js
it('should transfer personal pull request read status', async () => {
	const firstRepo = createInternalRepositoryData({ read: false });
	firstRepo.myPullRequests = [{ id: 'myPullID', read: false }];
	const response = await transferUserStatus([firstRepo]);

	expect(response[0].myPullRequests[0].read).toBe(true);
});
```

In `index.test.js`, add assertions to existing toggle tests after adding `myPullRequests` to generated repositories:

```js
expect(repo1.myPullRequests[0].read).toBe(true);
```

Add a browser navigation test:

```js
it('should set personal pull request as read based on incoming url', async () => {
	const itemToChange = createInternalRepositories()[0].myPullRequests[0];
	const response = await setItemInRepoAsReadBasedOnUrl(itemToChange.url);

	expect(response[0].myPullRequests[0].read).toBe(true);
});
```

In `utils.test.js`, assert `repoHasUnreadItems` returns true for unread `myPullRequests`.

- [ ] **Step 2: Run the failing read-state tests**

Run:

```bash
npm run test:once -- src/entrypoints/background/api/__tests__/transfer.test.js src/entrypoints/background/lib/__tests__/index.test.js src/entrypoints/github.content/utils/__tests__/utils.test.js
```

Expected before implementation: FAIL because read-state helpers ignore `myPullRequests`.

- [ ] **Step 3: Update generators**

In `createInternalRepositoryData`, add:

```js
myPullRequests: [
	{
		author: login,
		comments: 5,
		createdAt: date,
		id: 'myPullID',
		read,
		reviewStatus: null,
		title: 'My Pull title 1',
		updatedAt: date,
		url: createRepoURL({
			userName: login,
			repoName,
			subPath: '/pull/22',
		}),
	},
],
```

- [ ] **Step 4: Update read-state implementation**

In `transfer.js`, transfer `myPullRequests`:

```js
const myPullRequests = tranferReadStatusOfItem(
	newRepo.myPullRequests,
	oldRepo.myPullRequests,
);

return {
	...newRepo,
	collapsed,
	issues,
	myPullRequests,
	pullRequests,
};
```

In `lib/index.js`, update `toggleRead`:

```js
return {
	...repo,
	issues: setArrayItemReadStatus(repo.issues, repo.url, request),
	myPullRequests: setArrayItemReadStatus(
		repo.myPullRequests || [],
		repo.url,
		request,
	),
	pullRequests: setArrayItemReadStatus(repo.pullRequests, repo.url, request),
};
```

Update `setItemInRepoAsReadBasedOnUrl`:

```js
const myPullRequests = findItemByURL(repo.myPullRequests || [], url);

return {
	...repo,
	issues,
	myPullRequests,
	pullRequests,
};
```

In `utils.js`, update unread detection:

```js
export function repoHasUnreadItems(repo) {
	return (
		repo.issues?.some((item) => !item.read) ||
		repo.myPullRequests?.some((item) => !item.read) ||
		repo.pullRequests?.some((item) => !item.read) ||
		false
	);
}
```

- [ ] **Step 5: Run read-state tests**

Run:

```bash
npm run test:once -- src/entrypoints/background/api/__tests__/transfer.test.js src/entrypoints/background/lib/__tests__/index.test.js src/entrypoints/github.content/utils/__tests__/utils.test.js
```

Expected after implementation: PASS.

---

### Task 5: Render `My pull requests`

**Files:**
- Modify: `src/entrypoints/github.content/components/Repositories/type.jsx`
- Modify: `src/entrypoints/github.content/components/Repositories/repository.jsx`
- Test: `src/entrypoints/github.content/__tests__/app.test.js`

**Interfaces:**
- Consumes: `repo.myPullRequests`
- Produces: visible heading `My pull requests (0)` or `My pull requests (N)` above `Pull requests`.

- [ ] **Step 1: Write failing UI tests**

Add tests to `app.test.js`:

```js
it('should render my pull requests section even when empty', () => {
	const serverData = createQuickStorage();
	serverData.repositories[0].myPullRequests = [];
	serverData.repositories[0].collapsed = false;
	setupDataFromBackground(serverData);

	const { queryByText } = render();

	expect(queryByText('My pull requests (0)')).toBeInTheDocument();
});

it('should render my pull requests above general pull requests', () => {
	const serverData = createQuickStorage();
	serverData.repositories[0].collapsed = false;
	setupDataFromBackground(serverData);

	const { container } = render();
	const text = container.textContent;

	expect(text.indexOf('My pull requests (1)')).toBeLessThan(
		text.indexOf('Pull requests'),
	);
	expect(text).toContain('My Pull title 1');
});
```

- [ ] **Step 2: Run the failing UI tests**

Run: `npm run test:once -- src/entrypoints/github.content/__tests__/app.test.js`

Expected before implementation: FAIL because `My pull requests` is not rendered.

- [ ] **Step 3: Generalize `Type` metadata**

In `type.jsx`, replace `itemData` with:

```js
const itemData = {
	issues: {
		text: 'Issues',
		url: 'issues',
		icon: 'issues',
		count: () => {
			const totalNrItems = repo.totalItems.issues;
			const itemsShown =
				settings.numberOfItems >= totalNrItems
					? ''
					: `${settings.numberOfItems} of `;
			return totalNrItems > 0 && `(${itemsShown}${totalNrItems})`;
		},
	},
	myPullRequests: {
		text: 'My pull requests',
		url: 'pulls',
		icon: 'pullRequests',
		count: () => `(${repo.myPullRequests?.length || 0})`,
	},
	pullRequests: {
		text: 'Pull requests',
		url: 'pulls',
		icon: 'pullRequests',
		count: () => {
			const totalNrItems = repo.totalItems.pullRequests;
			const itemsShown =
				settings.numberOfItems >= totalNrItems
					? ''
					: `${settings.numberOfItems} of `;
			return totalNrItems > 0 && `(${itemsShown}${totalNrItems})`;
		},
	},
};
```

Use `item.icon` in the icon render:

```jsx
<Icons icon={item.icon} />
```

Use `item.count()` in the heading:

```jsx
{item.text} {item.count()}
```

- [ ] **Step 4: Render the new section in repository order**

In `repository.jsx`, replace `availableItems` with:

```js
const availableItems =
	settings.listItemOfType === 'all'
		? ['issues', 'myPullRequests', 'pullRequests']
		: settings.listItemOfType === 'pullRequests'
			? ['myPullRequests', 'pullRequests']
			: [settings.listItemOfType];
```

This preserves the existing `issues`-only setting while making `My pull requests` stable whenever pull request sections are visible.

- [ ] **Step 5: Run UI tests**

Run: `npm run test:once -- src/entrypoints/github.content/__tests__/app.test.js`

Expected after implementation: PASS with updated snapshots showing the new section.

---

### Task 6: Full Verification

**Files:**
- No new source files.
- Test all modified areas.

**Interfaces:**
- Consumes: all tasks above.
- Produces: verified implementation ready for manual extension testing.

- [ ] **Step 1: Install dependencies if needed**

If `node_modules` is missing, run:

```bash
npm install
```

Expected: dependencies install and WXT postinstall prepares the extension.

- [ ] **Step 2: Run all tests once**

Run:

```bash
npm run test:once
```

Expected: all Vitest suites pass.

- [ ] **Step 3: Run the build**

Run:

```bash
npm run build
```

Expected: WXT builds the extension without errors.

- [ ] **Step 4: Run a targeted manual smoke test**

Run:

```bash
npm run dev
```

Expected: WXT starts on port `5115`.

Load the extension in Chrome, open a GitHub repository, and verify:

- Expanded repos show `Issues`, `My pull requests (0 or N)`, then `Pull requests`.
- `My pull requests` remains visible when empty.
- A PR matching author, assignee, or review-requested appears in `My pull requests`.
- The same PR may still appear in `Pull requests`.
- Marking a repo as read updates items in `My pull requests`.
- Visiting a listed PR marks it read on the next browser navigation update.

---

## Self-Review

- Spec coverage: The plan covers personal PR fetching, mapping, read status, UI rendering, empty section behavior, duplication, no settings changes, and verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation placeholders remain.
- Type consistency: The plan uses `myPullRequests` consistently across repository data, mapping, read-state helpers, and UI rendering.
