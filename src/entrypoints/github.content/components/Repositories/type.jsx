import React from 'react';
import Item from './item.jsx';
import Icons from '../../images/svgs/icons';

export default function Type({ settings, sendToBackend, repo, type }) {
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

	const item = itemData[type];
	const url = `${repo.url}/${item.url}`;
	const count = item.count();

	return (
		<div className={type}>
			<div className="itemHeading">
				<div className="grid-1" />

				<div className="grid-1">
					<Icons icon={item.icon} />
				</div>

				<div className="grid">
					<h4>
						<a href={url}>{count ? `${item.text} ${count}` : item.text}</a>
					</h4>
				</div>
			</div>

			{repo[type] && repo[type].length > 0 && (
				<ul>
					{repo[type].map((item) => {
						return (
							<Item
								key={item.id}
								item={item}
								type={type}
								sendToBackend={sendToBackend}
								settings={settings}
							/>
						);
					})}
				</ul>
			)}
		</div>
	);
}
