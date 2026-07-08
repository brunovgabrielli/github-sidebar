import React, { useState } from 'react';
import Item from './item.jsx';
import Icons from '../../images/svgs/icons';

export default function Type({ settings, sendToBackend, repo, type }) {
	const [collapsed, setCollapsed] = useState(false);

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
	const hasItems = repo[type] && repo[type].length > 0;
	const handleToggleCollapsed = () => {
		setCollapsed(!collapsed);
	};

	return (
		<div className={`${type}${collapsed ? ' typeCollapsed' : ''}`}>
			<div className="itemHeading">
				<div className="grid-1">
					<button
						type="button"
						className="typeToggle"
						aria-label={`Toggle ${item.text} list`}
						onClick={handleToggleCollapsed}
					>
						<Icons icon="arrow" />
					</button>
				</div>

				<div className="grid-1">
					<Icons icon={item.icon} />
				</div>

				<div className="grid">
					<h4>
						<a href={url}>{count ? `${item.text} ${count}` : item.text}</a>
					</h4>
				</div>
			</div>

			{!collapsed && hasItems && (
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
