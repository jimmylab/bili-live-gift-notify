// ==UserScript==
// @name         b站直播礼物通知
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  b站直播礼物通知
// @author       JimmyLiu
// @include      /^https?://live\.bilibili\.com/\d+/
// @grant        GM_setClipboard
// @downloadURL  https://raw.githubusercontent.com/jimmylab/bili-live-gift-notify/master/bili-live-gift-notify.user.js
// @noframes
// ==/UserScript==

// 可以把上面的@include一行删掉换成如下，使脚本仅在自己直播间生效：
// // @match https://live.bilibili.com/房间号

'use strict';

// 可自定义背景颜色，如#caafc9
const BACKGROUND_COLOR = '#FFFFFF'

// 只提示高价的礼物(小电视、摩天大楼、天空之翼、礼花……待更新)
const EXPENSIVE_GIFT_ONLY = true;

const PATTERN_GIFT_TOTAL_COUNT = /总(\d+)个/;
const PATTERN_GIFT_COUNT = /(\d+)连击|x(\d+)/;

let capturePanel;

function loadScript(src) {
	return new Promise((resolve, reject) => {
		let script = document.createElement("script");
		script.type = "text/javascript";
		script.src = src;
		script.addEventListener('load', resolve);
		script.addEventListener('error', e => reject(e.error));
		document.head.appendChild(script);
	});
}

const injectCSS = (() => {
	let styleElem = document.createElement("style");
	styleElem.type = 'text/css';
	document.head.appendChild(styleElem);
	return (...rules) => {
		styleElem.textContent = rules.join('\n')
		// rules.map(rule => styleElem.sheet.insertRule(rule))
	}
}) ()

function createCapturePanel() {
	let backgroundColor = BACKGROUND_COLOR || 'rgba(255, 255, 255, 0.875)'
	injectCSS(
		`#gift-capture-mask {
			position: fixed;
			top: 0;
			left: 0;
			width: 50vw;
			height: 75vh;
			background: ${backgroundColor};
			z-index: 10000;
			padding: 0;
			margin: 0;
			user-select: none;
		}`,
		`#gift-capture {
			width: 100%;
			height: 100%;
			display: flex;
			flex-direction: column;
			flex-wrap: wrap;
			align-content: flex-start;
		}`,
		`#gift-capture > .chat-item, #capture > canvas {
			width: 300px !important;
			display: flex;
			align-items: center;
		}`,
		`#gift-capture .gift-frame {
			animation: none;
		}`,
		`#gift-capture > .chat-item.system-msg.border-box {
			margin: 0 !important;
		}`,
	)

	let panel = document.createElement('div');
	panel.id = 'gift-capture-mask';
	panel.className = 'gift-capture-mask chat-history-panel';
	let parent = document.body;
	parent.appendChild(panel);

	capturePanel = document.createElement('div');
	capturePanel.id = 'gift-capture';
	capturePanel.className = 'chat-history-list';
	panel.appendChild(capturePanel);

	let isDown = false;
	let diffX, diffY;
	panel.addEventListener('dblclick', ev => {
		if (panel.style.width === '100vw') {
			panel.style.width = '50vw';
			panel.style.height = '75vh';
		} else {
			panel.style.width = '100vw';
			panel.style.height = '100vh';
		}
	});
	panel.addEventListener('mousedown', ev => {
		diffX = ev.clientX - panel.offsetLeft;
		diffY = ev.clientY - panel.offsetTop;
		panel.style.cursor = 'move';
		isDown = true;
	});
	window.addEventListener('mousemove', ev => {
		if (isDown === false) {
			return;
		}
		var X = ev.clientX - diffX;
		var Y = ev.clientY - diffY;
		panel.style.left = X + 'px';
		panel.style.top = Y + 'px';
	});
	panel.addEventListener('mouseup', ev => {
		isDown = false;
		let offsetRight  = parent.clientWidth - panel.offsetLeft - panel.offsetWidth,
			offsetBottom = window.innerHeight - panel.offsetTop - panel.offsetHeight;

		if (panel.offsetLeft <= 5) {
			panel.style.left = 0;
		} else if (offsetRight < 5) {
			panel.style.left = `${parent.clientWidth - panel.offsetWidth}px`;
		}
		if (panel.offsetTop <= 5) {
			panel.style.top = 0;
		} else if (offsetBottom < 5) {
			panel.style.top = `${window.innerHeight - panel.offsetHeight}px`;
		}

		panel.style.cursor = 'default';
	})
	window.panel = capturePanel;
}

function startObserve() {
	'use strict';

	createCapturePanel();

	const targetNode = document.getElementById('chat-items');
	const callback = function(mutationList, observer) {
		mutationList.forEach(mutation => {
			mutation.addedNodes.forEach(node => {
				if (node.matches('.chat-item.gift-item')) {
					let countElem = node.querySelector('.gift-count'),
						countTotalElem = node.querySelector('.gift-total-count');
					let count = 1, isCombo = false, isTotal = false;
					if (countTotalElem) {
						let match = countTotalElem.textContent.trim().match(PATTERN_GIFT_TOTAL_COUNT);
						if (match) {
							count = parseInt(match[1]);
							isTotal = true;
						}
					} else if (countElem) {
						let match = countElem.textContent.trim().match(PATTERN_GIFT_COUNT);
						if (match) {
							if ('undefined' !== typeof match[1]) {
								count = parseInt(match[1]);
								isCombo = true;
							} else {
								count = parseInt(match[2]);
								isTotal = true;
							}
						}
					}
					let username = node.querySelector('.username');
					username = username ? username.textContent.trim() : '<未知用户>';
					// 礼物通知
					let giftFrame = node.querySelector('.gift-frame');
					if (giftFrame.matches('.gift-25-40')) {
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '小电视', giftName: '小电视', username, count, isCombo, isTotal, node }, bubbles: false } )
						);
					} else if (giftFrame.matches('.gift-20003-40')) {
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '摩天大楼', giftName: '摩天大楼', username, count, isCombo, isTotal, node }, bubbles: false } )
						);
					} else if (giftFrame.matches('.gift-30087-40')) {
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '天空之翼', giftName: '天空之翼', username, count, isCombo, isTotal, node }, bubbles: false } )
						);
					} else if (giftFrame.matches('.gift-30064-40')) {
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '礼花', giftName: '礼花', username, count, isCombo, isTotal, node }, bubbles: false } )
						);
					} else {
						// 其他礼物，测试
						let giftName = node.querySelector('.gift-name');
						giftName = (giftName) ? giftName.textContent.trim() : '';
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '其他礼物', giftName, username, count, isCombo, isTotal, node }, bubbles: false } )
						);
					}
				} else if (node.matches('.chat-item.system-msg.border-box')) {
					let captionElems = node.querySelectorAll('span.v-middle')
					let isShipMsg = Array.from(captionElems).find(elem => elem.textContent.match(/舰长|提督|总督/));
					let username = captionElems[0];
					username = username ? username.textContent.trim() : '<未知用户>';
					if (isShipMsg) {
						let giftName = isShipMsg.textContent.trim();
						// 上船消息
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '上船', giftName, username, count: 1, isCombo: false, isTotal: true, node }, bubbles: false } )
						);
					}
				}
			})
		});
	};
	const observer = new MutationObserver(callback);
	// TODO: 连击去重，同人同礼物合并
	try {
		console.log('try observe')
		observer.observe(targetNode, { childList: true });
		console.log('observe started')
		targetNode.addEventListener('newGift', ev => {
			let { detail } = ev;
			console.log(detail)
			if (!EXPENSIVE_GIFT_ONLY || detail.type !== '其他礼物') {
				// html2canvas(ev.detail.node).then(function(canvas) {
				// 	document.getElementById('capture').appendChild(canvas);
				// });
				if ('undefined' === typeof detail.node) {
					console.log('detail undefined')
				}
				let node = detail.node.cloneNode(true)
				capturePanel.appendChild(node);
				if (detail.isCombo) {
					setTimeout(() => {
						$(node).fadeOut(500, function() {
							$(this).remove();
						})
					}, 1500)
				}
			}
		})
	} catch(error) {
		console.log(targetNode)
		console.log(error)
	}
}

(async function() {
	// await loadScript('http://html2canvas.hertzen.com/dist/html2canvas.min.js')
	setTimeout(startObserve, 5000);
}) ();
