(() => {
	((root, factory) => {
		if (typeof module !== 'undefined' && module.exports) {
			// CommonJS
			return module.exports = factory();
		} else if (typeof define === 'function' && define.amd) {
			// AMD
			define([], () => {
				return (root.TimeMe = factory());
			});
		} else {
			// Global Variables
			return root.TimeMe = factory();
		}
	})(this, () => {

		let TimeMe = {

			startStopTimes: {},
			idleTimeoutMs: 30 * 1000,
			currentIdleTimeMs: 0,
			checkIdleStateRateMs: 250,
			isUserCurrentlyOnPage: true, 
			isUserCurrentlyIdle: false, 
			currentPageName: "default-page-name",
			timeElapsedCallbacks: [],
			userLeftCallbacks: [],
			userReturnCallbacks: [],

			trackTimeOnElement: (elementId) => {
				let element = document.getElementById(elementId);
				if (element) {
					element.addEventListener("mouseover", () => {
						TimeMe.startTimer(elementId);
					});
					element.addEventListener("mousemove", () => {
						TimeMe.startTimer(elementId);
					});
					element.addEventListener("mouseleave", () => {
						TimeMe.stopTimer(elementId);
					});
					element.addEventListener("keypress", () => {
						TimeMe.startTimer(elementId);
					});
					element.addEventListener("focus", () => {
						TimeMe.startTimer(elementId);
					});
				}
			},

			getTimeOnElementInSeconds: (elementId) => {
				let time = TimeMe.getTimeOnPageInSeconds(elementId);
				if (time) {
					return time;
				} else {
					return 0;
				}
			},

			// startTime is optional. If provided, must be of type Date(). By providing
			// startTime, you are overriding the internal timing mechanism and manually
			// indicating the start time.
			startTimer: (pageName, startTime) => {
				if (!pageName) {
					pageName = TimeMe.currentPageName;
				}

				if (TimeMe.startStopTimes[pageName] === undefined) {
					TimeMe.startStopTimes[pageName] = [];
				} else {
					let arrayOfTimes = TimeMe.startStopTimes[pageName];
					let latestStartStopEntry = arrayOfTimes[arrayOfTimes.length - 1];
					if (latestStartStopEntry !== undefined && latestStartStopEntry.stopTime === undefined) {
						// Can't start new timer until previous finishes.
						return;
					}
				}
				TimeMe.startStopTimes[pageName].push({
					"startTime": startTime || new Date(),
					"stopTime": undefined
				});				
			},

			stopAllTimers: () => {
				let pageNames = Object.keys(TimeMe.startStopTimes);
				for (let i = 0; i < pageNames.length; i++) {
					TimeMe.stopTimer(pageNames[i]);
				}
			},

			// stopTime is optional. If provided, must be of type Date(). By providing
			// stopTime, you are overriding the internal timing mechanism and manually
			// indicating the stop time.
			stopTimer: (pageName, stopTime) => {
				if (!pageName) {
					pageName = TimeMe.currentPageName;
				}
				let arrayOfTimes = TimeMe.startStopTimes[pageName];
				if (arrayOfTimes === undefined || arrayOfTimes.length === 0) {
					// Can't stop timer before you've started it.
					return;
				}
				if (arrayOfTimes[arrayOfTimes.length - 1].stopTime === undefined) {
					arrayOfTimes[arrayOfTimes.length - 1].stopTime = stopTime || new Date();
				}
			},

			getTimeOnCurrentPageInSeconds: () => {
				return TimeMe.getTimeOnPageInSeconds(TimeMe.currentPageName);
			},

			getTimeOnPageInSeconds: (pageName) => {
				let timeInMs = TimeMe.getTimeOnPageInMilliseconds(pageName);
				if (timeInMs === undefined) {
					return undefined;
				} else {
					return timeInMs / 1000;
				}
			},

			getTimeOnCurrentPageInMilliseconds: () => {
				return TimeMe.getTimeOnPageInMilliseconds(TimeMe.currentPageName);
			},

			getTimeOnPageInMilliseconds: (pageName) => {

				let totalTimeOnPage = 0;

				let arrayOfTimes = TimeMe.startStopTimes[pageName];
				if (arrayOfTimes === undefined) {
					// Can't get time on page before you've started the timer.
					return;
				}

				let timeSpentOnPageInSeconds = 0;
				for (let i = 0; i < arrayOfTimes.length; i++) {
					let startTime = arrayOfTimes[i].startTime;
					let stopTime = arrayOfTimes[i].stopTime;
					if (stopTime === undefined) {
						stopTime = new Date();
					}
					let difference = stopTime - startTime;
					timeSpentOnPageInSeconds += (difference);
				}

				totalTimeOnPage = Number(timeSpentOnPageInSeconds);
				return totalTimeOnPage;
			},

			getTimeOnAllPagesInSeconds: () => {
				let allTimes = [];
				let pageNames = Object.keys(TimeMe.startStopTimes);
				for (let i = 0; i < pageNames.length; i++) {
					let pageName = pageNames[i];
					let timeOnPage = TimeMe.getTimeOnPageInSeconds(pageName);
					allTimes.push({
						"pageName": pageName,
						"timeOnPage": timeOnPage
					});
				}
				return allTimes;
			},

			setIdleDurationInSeconds: (duration) => {
				let durationFloat = parseFloat(duration);
				if (isNaN(durationFloat) === false) {
					TimeMe.idleTimeoutMs = duration * 1000;
				} else {
					throw {
						name: "InvalidDurationException",
						message: "An invalid duration time (" + duration + ") was provided."
					};
				}
			},

			setCurrentPageName: (pageName) => {
				TimeMe.currentPageName = pageName;
			},

			resetRecordedPageTime: (pageName) => {
				delete TimeMe.startStopTimes[pageName];
			},

			resetAllRecordedPageTimes: () => {
				let pageNames = Object.keys(TimeMe.startStopTimes);
				for (let i = 0; i < pageNames.length; i++) {
					TimeMe.resetRecordedPageTime(pageNames[i]);
				}
			},
			userActivityDetected: () => {
				if (TimeMe.isUserCurrentlyIdle) {
					TimeMe.triggerUserHasReturned();
				}
				TimeMe.resetIdleCountdown();
			},
			resetIdleCountdown: () => {
				TimeMe.isUserCurrentlyIdle = false;
				TimeMe.currentIdleTimeMs = 0;
			},

			callWhenUserLeaves: (callback, numberOfTimesToInvoke) => {
				TimeMe.userLeftCallbacks.push({
					callback: callback,
					numberOfTimesToInvoke: numberOfTimesToInvoke
				})
			},

			callWhenUserReturns: (callback, numberOfTimesToInvoke) => {
				TimeMe.userReturnCallbacks.push({
					callback: callback,
					numberOfTimesToInvoke: numberOfTimesToInvoke
				})
			},

			triggerUserHasReturned: () => {
				if (!TimeMe.isUserCurrentlyOnPage) {
					TimeMe.isUserCurrentlyOnPage = true;
					TimeMe.resetIdleCountdown();
					for (let i = 0; i < TimeMe.userReturnCallbacks.length; i++) {
						let userReturnedCallback = TimeMe.userReturnCallbacks[i];
						let numberTimes = userReturnedCallback.numberOfTimesToInvoke;
						if (isNaN(numberTimes) || (numberTimes === undefined) || numberTimes > 0) {
							userReturnedCallback.numberOfTimesToInvoke -= 1;
							userReturnedCallback.callback();
						}
					}
				}
				TimeMe.startTimer();
			},
			// TODO - we are muddying the waters in between
			// 'user left page' and 'user gone idle'. Really should be
			// two separate concepts entirely. Need to break this into smaller  functions
			// for either scenario.
			triggerUserHasLeftPageOrGoneIdle: () => {
				if (TimeMe.isUserCurrentlyOnPage) {
					TimeMe.isUserCurrentlyOnPage = false;					
					for (let i = 0; i < TimeMe.userLeftCallbacks.length; i++) {
						let userHasLeftCallback = TimeMe.userLeftCallbacks[i];
						let numberTimes = userHasLeftCallback.numberOfTimesToInvoke;
						if (isNaN(numberTimes) || (numberTimes === undefined) || numberTimes > 0) {
							userHasLeftCallback.numberOfTimesToInvoke -= 1;
							userHasLeftCallback.callback();
						}
					}
				}
				TimeMe.stopAllTimers();
			},

			callAfterTimeElapsedInSeconds: (timeInSeconds, callback) => {
				TimeMe.timeElapsedCallbacks.push({
					timeInSeconds: timeInSeconds,
					callback: callback,
					pending: true
				});
			},

			checkIdleState: () => {
				for (let i = 0; i < TimeMe.timeElapsedCallbacks.length; i++) {
					if (TimeMe.timeElapsedCallbacks[i].pending && TimeMe.getTimeOnCurrentPageInSeconds() > TimeMe.timeElapsedCallbacks[i].timeInSeconds) {
						TimeMe.timeElapsedCallbacks[i].callback();
						TimeMe.timeElapsedCallbacks[i].pending = false;
					}
				}
				if (TimeMe.isUserCurrentlyIdle === false && TimeMe.currentIdleTimeMs > TimeMe.idleTimeoutMs) {
					TimeMe.isUserCurrentlyIdle = true;
					TimeMe.triggerUserHasLeftPageOrGoneIdle();
				} else {
					TimeMe.currentIdleTimeMs += TimeMe.checkIdleStateRateMs;
				}
			},

			visibilityChangeEventName: undefined,
			hiddenPropName: undefined,

			listenForVisibilityEvents: (trackWhenUserLeavesPage, trackWhenUserGoesIdle) => {

				if (trackWhenUserLeavesPage) {
					TimeMe.listenForUserLeavesOrReturnsEvents();
				}

				if (trackWhenUserGoesIdle) {
					TimeMe.listForIdleEvents();
				}

			},

			listenForUserLeavesOrReturnsEvents: () => {
				if (typeof document.hidden !== "undefined") {
					TimeMe.hiddenPropName = "hidden";
					TimeMe.visibilityChangeEventName = "visibilitychange";
				} else if (typeof document.mozHidden !== "undefined") {
					TimeMe.hiddenPropName = "mozHidden";
					TimeMe.visibilityChangeEventName = "mozvisibilitychange";
				} else if (typeof document.msHidden !== "undefined") {
					TimeMe.hiddenPropName = "msHidden";
					TimeMe.visibilityChangeEventName = "msvisibilitychange";
				} else if (typeof document.webkitHidden !== "undefined") {
					TimeMe.hiddenPropName = "webkitHidden";
					TimeMe.visibilityChangeEventName = "webkitvisibilitychange";
				}

				document.addEventListener(TimeMe.visibilityChangeEventName, () => {
					if (document[TimeMe.hiddenPropName]) {
						TimeMe.triggerUserHasLeftPageOrGoneIdle();
					} else {
						TimeMe.triggerUserHasReturned();
					}
				}, false);

				window.addEventListener('blur', () => {
					TimeMe.triggerUserHasLeftPageOrGoneIdle();
				});

				window.addEventListener('focus', () => {
					TimeMe.triggerUserHasReturned();
				});
			},

			listForIdleEvents: () => {
				document.addEventListener("mousemove", () => { TimeMe.userActivityDetected(); });
				document.addEventListener("keyup", () => { TimeMe.userActivityDetected(); });
				document.addEventListener("touchstart", () => { TimeMe.userActivityDetected(); });
				window.addEventListener("scroll", () => { TimeMe.userActivityDetected(); });

				setInterval(() => {
					if (TimeMe.isUserCurrentlyIdle !== true) {
						TimeMe.checkIdleState();
					}
				}, TimeMe.checkIdleStateRateMs);
			},

			websocket: undefined,

			websocketHost: undefined,

			setUpWebsocket: (websocketOptions) => {
				if (window.WebSocket && websocketOptions) {
					let websocketHost = websocketOptions.websocketHost; // "ws://hostname:port"
					try {
						TimeMe.websocket = new WebSocket(websocketHost);
						window.onbeforeunload = () => {
							TimeMe.sendCurrentTime(websocketOptions.appId);
						};
						TimeMe.websocket.onopen = () => {
							TimeMe.sendInitWsRequest(websocketOptions.appId);
						}
						TimeMe.websocket.onerror = (error) => {
							if (console) {
								console.log("Error occurred in websocket connection: " + error);
							}
						}
						TimeMe.websocket.onmessage = (event) => {
							if (console) {
								console.log(event.data);
							}
						}
					} catch (error) {
						if (console) {
							console.error("Failed to connect to websocket host.  Error:" + error);
						}
					}
				}
			},

			websocketSend: (data) => {
				TimeMe.websocket.send(JSON.stringify(data));
			},

			sendCurrentTime: (appId) => {
				let timeSpentOnPage = TimeMe.getTimeOnCurrentPageInMilliseconds();
				let data = {
					type: "INSERT_TIME",
					appId: appId,
					timeOnPageMs: timeSpentOnPage,
					pageName: TimeMe.currentPageName
				};
				TimeMe.websocketSend(data);
			},
			sendInitWsRequest: (appId) => {
				let data = {
					type: "INIT",
					appId: appId
				};
				TimeMe.websocketSend(data);
			},

			initialize: (options) => {

				let idleTimeoutInSeconds = TimeMe.idleTimeoutMs || 30;
				let currentPageName = TimeMe.currentPageName || "default-page-name";
				let websocketOptions = undefined;
				let initialStartTime = undefined;
				let trackWhenUserLeavesPage = true;
				let trackWhenUserGoesIdle = true;

				if (options) {
					idleTimeoutInSeconds = options.idleTimeoutInSeconds || idleTimeoutInSeconds;
					currentPageName = options.currentPageName || currentPageName;
					websocketOptions = options.websocketOptions;
					initialStartTime = options.initialStartTime;

					if (options.trackWhenUserLeavesPage === false) {
						trackWhenUserLeavesPage = false;
					}
					if (options.trackWhenUserGoesIdle === false) {
						trackWhenUserGoesIdle = false;
					}
				}

				TimeMe.setIdleDurationInSeconds(idleTimeoutInSeconds)
				TimeMe.setCurrentPageName(currentPageName)
				TimeMe.setUpWebsocket(websocketOptions)
				TimeMe.listenForVisibilityEvents(trackWhenUserLeavesPage, trackWhenUserGoesIdle);

				// TODO - only do this if page currently visible.

				TimeMe.startTimer(undefined, initialStartTime);
			}
		};
		return TimeMe;
	});
}).call(this);

//initialise timeme
TimeMe.initialize({
    currentPageName: "my-home-page", // current page
    idleTimeoutInSeconds: 5 // stop recording time due to inactivity
});



//functions to perform on each webpage
    var element = document.createElement("button");
    element.innerHTML=0;
    element.setAttribute("id", "timeInSeconds");
    element.style.top = 0;
    element.style.right = 0;
    element.style.position='fixed';
    element.style.width = 'fit-content';
    element.style.height = 'fit-content';
   var body = document.getElementsByTagName('body')[0];
   if(body.id==""||body.id=="timeTrackingId")
   {
       if(body.id=="")
       {
            body.appendChild(element);
            body.setAttribute("id", "timeTrackingId");
            
       }
       TimeMe.trackTimeOnElement('timeTrackingId');
        setInterval(function () {
            let timeSpentOnElement = TimeMe.getTimeOnElementInSeconds('timeTrackingId');
            //console.log('time '+timeSpentOnElement)
            var timer=document.getElementById('timeInSeconds');
            if(timer!=null)
                timer.textContent = timeSpentOnElement.toFixed(2);
            else{
                console.log('timer '+timer);
                console.log('pop_up not opened');
            }
        },37);
   }
   else{
       console.log('body id'+body.id);
       console.log('body id is not null');
   }


// let timeSpentOnElement = TimeMe.getTimeOnElementInSeconds('timemeTrackingId');
// console.log('seconds '+timeSpentOnElement);
// document.getElementById('timeInSeconds').textContent = timeSpentOnElement.toFixed(2);