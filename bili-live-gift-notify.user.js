// ==UserScript==
// @name         b站直播礼物通知
// @namespace    http://tampermonkey.net/
// @version      0.5
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

// 可自定义背景颜色，如#caafc9, rgb(22 22 22)
const BACKGROUND_COLOR = '#FFFFFF'

// 此值为true时只提示高价的礼物(小电视、摩天大楼、天空之翼、礼花……更多待更新)
const EXPENSIVE_GIFT_ONLY = true;

// 贵重礼物在此定义
const GIFT_CLASS_MAP = {
	'.gift-25-40': '小电视',
	'.gift-20003-40': '摩天大楼',
	'.gift-30087-40': '天空之翼',
	'.gift-30064-40': '礼花',
	'.gift-30669-40': '爱的魔力',
};
const GIFT_CLASSNAME = Object.keys(GIFT_CLASS_MAP);

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
	const STICKY_BORDER = 6;
	injectCSS(
		`#gift-capture-mask {
			background: ${backgroundColor};
			position: fixed;
			top: 0;
			left: 0;
			width: 50vw;
			height: 75vh;
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
			font-size: 12px;
		}`,
		`#gift-capture > .chat-item, #capture > canvas {
			display: flex;
			align-items: center;
			margin: 2px 10px 3px 0 !important;
		}`,
		`#gift-capture > .chat-item.gift-item {
			box-sizing: border-box;
			padding: 0;
		}`,
		`#gift-capture .gift-frame {
			animation: none;
			width: 30px !important;
			height: 30px !important;
		}`,
		`#gift-capture > .chat-item.system-msg.border-box {
			min-height: 54px !important;
			max-width: 290px;
		}`,
		`#gift-capture .msg-icon.bg-cover.dp-relative {
			width: 54px;
			height: 54px;
		}`,
	)

	const panel = document.createElement('div');
	panel.id = 'gift-capture-mask';
	panel.className = 'gift-capture-mask chat-history-panel';
	document.body.appendChild(panel);

	capturePanel = document.createElement('div');
	capturePanel.id = 'gift-capture';
	capturePanel.className = 'chat-history-list';
	panel.appendChild(capturePanel);

	let isDown = false;
	let diffX, diffY;
	panel.addEventListener('dblclick', function(ev) {
		if (this.style.width === '100vw') {
			this.style.width = '50vw';
			this.style.height = '75vh';
		} else {
			this.style.width = '100vw';
			this.style.height = '100vh';
		}
	});

	const docElem = document.documentElement;

	Object.defineProperties(panel, {
		'offsetRight': {
			get() {
				return docElem.clientWidth - this.offsetLeft - this.offsetWidth;
			}
		},
		'offsetBottom': {
			get() {
				return docElem.clientHeight - this.offsetTop - this.offsetHeight;
			}
		},
		'dockRight': {
			get() {
				return docElem.clientWidth - this.offsetWidth;
			}
		},
		'dockBottom': {
			get() {
				return docElem.clientHeight - this.offsetHeight;
			}
		},
	});

	panel.addEventListener('mousedown', function(ev) {
		diffX = ev.clientX - this.offsetLeft;
		diffY = ev.clientY - this.offsetTop;
		this.style.cursor = 'move';
		isDown = true;

		panel.addEventListener('mouseleave', mouseleave);    // 注意mousemove和mouseleave的区别
		window.addEventListener('mousemove', mousemove);    // 注意是window
	});

	function mousemove(ev) {
		if (isDown === false) return;
		let X = ev.clientX - diffX;
		let Y = ev.clientY - diffY;
		panel.style.left = X + 'px';
		panel.style.top = Y + 'px';
	}

	function mouseup(ev) {
		ev.preventDefault();
		isDown = false;
		let {offsetLeft: X, offsetTop: Y, offsetRight, offsetBottom} = this;

		if (X < STICKY_BORDER) {
			this.style.left = '0px';
		} else if (offsetRight < STICKY_BORDER) {
			this.style.left = `${this.dockRight}px`;
		}
		if (Y < STICKY_BORDER) {
			this.style.top = '0px';
		} else if (offsetBottom < STICKY_BORDER) {
			this.style.top = `${this.dockBottom}px`;
		}

		// Remove handlers
		panel.removeEventListener('mouseleave', mouseleave);
		window.removeEventListener('mousemove', mousemove);

		// Restore cursor
		panel.style.cursor = 'default';    
	}

	function mouseleave(ev) {
		console.log(mouseleave)
		mouseup.call(panel, ev)
	}

	panel.addEventListener('mouseup', mouseup, {});
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
					let giftClass = GIFT_CLASSNAME.find( className => giftFrame.matches(className) );
					if (giftClass) {
						let giftName = GIFT_CLASS_MAP[giftClass];
						targetNode.dispatchEvent(
							new CustomEvent( 'newGift', { detail: { type: '礼物', giftName, username, count, isCombo, isTotal, node }, bubbles: false } )
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
					let captionElems = Array.from(node.querySelectorAll('span.v-middle'))
					let isShipMsg = captionElems.find(elem => elem.textContent.match(/舰长|提督|总督/));
					let username = captionElems[0];
					username = username ? username.textContent.trim() : '<未知用户>';
					if (isShipMsg) {
						if ( !captionElems.find(elem => elem.textContent.match(/开通了主播的|续费了主播的/)) ) {
							console.log('非本直播间大航海')
							console.log(node)
							return;
						}
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
	setTimeout(startObserve, 5000);
}) ();
