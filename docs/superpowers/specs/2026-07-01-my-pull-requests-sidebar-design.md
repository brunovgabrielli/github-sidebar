# My Pull Requests Sidebar Section Design

## Summary

Add a `My pull requests` section inside each expanded repository in the GitHub Sidebar extension. The section highlights open pull requests that need the logged-in user's attention while preserving the existing `Pull requests` list unchanged.

## Goals

- Show a `My pull requests` section for every expanded repository, even when it has zero items.
- Include open pull requests where the logged-in user is the author, an assignee, or has a review request.
- Fetch the user's matching pull requests comprehensively, not only from the first `numberOfItems` pull requests already loaded for the general list.
- Keep the existing `Pull requests` section behavior unchanged.
- Allow a pull request to appear in both `My pull requests` and `Pull requests`.
- Reuse the existing pull request item layout and read/unread behavior where possible.

## Non-Goals

- Do not add a settings checkbox or mode selector in the first version.
- Do not deduplicate pull requests between the personal and general sections.
- Do not change issue behavior.
- Do not change the existing general pull request count or `numberOfItems` setting.
- Do not add support for unauthenticated personal pull request discovery.

## User Experience

When a repository is expanded, the content order becomes:

```text
Issues
My pull requests (0)
Pull requests (4 of 49)
```

If the user has matching pull requests, they render under `My pull requests` using the same item style as the existing pull request list:

```text
Issues
My pull requests (3)
  Pull request A
  Pull request B
  Pull request C
Pull requests (4 of 49)
  General pull request list
```

The `My pull requests` heading remains visible when the count is zero. This matches the current empty `Issues` section pattern and keeps the sidebar layout predictable.

The section label stays in English to match the rest of the extension.

## Data Model

Each repository gains a new array:

```js
{
  myPullRequests: []
}
```

Items in `myPullRequests` use the same internal shape as existing pull request items:

```js
{
  id,
  title,
  url,
  reviewStatus,
  updatedAt,
  createdAt,
  comments,
  read,
  author
}
```

This lets the UI reuse existing item rendering and read-status helpers with minimal branching.

## Fetching Strategy

Keep the current repository GraphQL query for the general `issues` and `pullRequests` lists.

Add a separate personal pull request fetch path for authenticated users. The query should return open pull requests in each configured repository where the logged-in user matches one of these relationships:

- Author
- Assignee
- Review requested

Use authenticated GitHub search qualifiers with `@me` to build focused search queries. For each configured repository, query these relationship-specific result sets and merge them by pull request `id`:

```text
repo:OWNER/NAME is:pr is:open author:@me
repo:OWNER/NAME is:pr is:open assignee:@me
repo:OWNER/NAME is:pr is:open review-requested:@me
```

This intentionally does not use broad involvement qualifiers that include commenters or mentions. The personal section must not be derived only by filtering the first `numberOfItems` general pull requests.

If the user has no token, the extension cannot reliably know the logged-in GitHub user or private repository pull request assignments. In that case, `myPullRequests` should remain an empty array and the UI should render the empty section.

## Mapping And Read Status

The mapping layer should populate `myPullRequests` alongside `issues` and `pullRequests`.

Read/unread status should be transferred by item `id`, matching the current behavior for issues and pull requests. If a pull request appears in both `myPullRequests` and `pullRequests`, changing read status by item should keep both representations consistent after the next storage update.

Repository-level "mark as read" should include `myPullRequests` so the visible personal section follows the same user expectation as the other visible lists.

Browser navigation that marks visited items as read should also check `myPullRequests`.

## UI Components

The repository component should render three section types in this order:

1. `issues`
2. `myPullRequests`
3. `pullRequests`

The existing `Type` component can be generalized to accept display metadata for the new `myPullRequests` type, including:

- Heading label: `My pull requests`
- Count behavior: simple item count, such as `(0)` or `(3)`
- Item renderer: existing pull request item behavior

The existing general `Pull requests` heading should retain its current total-count behavior, such as `(4 of 49)`.

## Error Handling

Personal pull request fetch failures should be best-effort. If the general repository query succeeds but a personal pull request search fails, the extension should keep the existing issues and general pull request refresh intact, render `myPullRequests` as an empty array for that cycle, and surface structured personal search errors through the existing header error UI when available.

## Testing

Add or update tests for:

- GraphQL/query generation for personal pull requests.
- Mapping personal pull request results into `repo.myPullRequests`.
- Rendering `My pull requests (0)` when no personal PRs exist.
- Rendering personal pull request items above the general `Pull requests` section.
- Preserving duplication when the same PR appears in both sections.
- Transferring read status for `myPullRequests` by item `id`.
- Marking `myPullRequests` as read for item-level, repo-level, and browser-navigation flows.
- Keeping existing issue and pull request rendering behavior unchanged.

## Open Decisions

No open product decisions remain for the first version.
