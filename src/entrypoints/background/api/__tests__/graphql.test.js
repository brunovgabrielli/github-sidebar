import {
	createMyPullRequestsQuery,
	createPullRequestsQuery,
} from '../graphql.js';
import {
	MY_PULL_REQUEST_RELATIONSHIPS,
	createMyPullRequestsQuery as createMyPullRequestsQueryFromIndex,
} from '../index.js';
import { createSettings } from '../../../../../test/generate.js';

describe('graphql', () => {
	it('re-exports the my pull requests API from the index barrel', () => {
		expect(createMyPullRequestsQueryFromIndex).toBe(createMyPullRequestsQuery);
		expect(MY_PULL_REQUEST_RELATIONSHIPS).toBeDefined();
	});

	it('should have an initial setup', () => {
		const repositories = createSettings().repos;
		const numberOfItems = 4;
		const sortBy = 'CREATED_AT';
		const graphqlData = createPullRequestsQuery(
			repositories,
			numberOfItems,
			sortBy,
		);
		expect(graphqlData).toMatchInlineSnapshot(`
			"query {
			            rateLimit {
			              limit
			              remaining
			              resetAt
			            }
			            viewer {
			              login
			            }
			            repo0: repository(owner: "githubusername", name: "reponame") {
			            name
			            url
			            owner {
			              login
			            }
			            issuesMaxNumber: issues(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            issues(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
			                  id
			                  title
			                  url
			                  updatedAt
			                  createdAt
			                  number
			                  author {
			                    login
			                  }
			                  comments {
			                    totalCount
			                  }
			                }
			              }
			            }   

			            pullRequestsMaxNumber: pullRequests(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            pullRequests(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
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
			          },repo1: repository(owner: "githubusername", name: "myotherrepo") {
			            name
			            url
			            owner {
			              login
			            }
			            issuesMaxNumber: issues(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            issues(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
			                  id
			                  title
			                  url
			                  updatedAt
			                  createdAt
			                  number
			                  author {
			                    login
			                  }
			                  comments {
			                    totalCount
			                  }
			                }
			              }
			            }   

			            pullRequestsMaxNumber: pullRequests(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            pullRequests(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
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
			          },repo2: repository(owner: "githubusername", name: "mythirdrepo") {
			            name
			            url
			            owner {
			              login
			            }
			            issuesMaxNumber: issues(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            issues(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
			                  id
			                  title
			                  url
			                  updatedAt
			                  createdAt
			                  number
			                  author {
			                    login
			                  }
			                  comments {
			                    totalCount
			                  }
			                }
			              }
			            }   

			            pullRequestsMaxNumber: pullRequests(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            pullRequests(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
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
			          },repo3: repository(owner: "differentUser", name: "projectrepo") {
			            name
			            url
			            owner {
			              login
			            }
			            issuesMaxNumber: issues(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            issues(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
			                  id
			                  title
			                  url
			                  updatedAt
			                  createdAt
			                  number
			                  author {
			                    login
			                  }
			                  comments {
			                    totalCount
			                  }
			                }
			              }
			            }   

			            pullRequestsMaxNumber: pullRequests(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
			              edges {
			                node {
			                  number
			                }
			              }
			            }
			            pullRequests(first: 4, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
			              totalCount
			              edges {
			                node {
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
			          }
			          }"
			`);
	});

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
});
