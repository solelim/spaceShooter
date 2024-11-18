//@ts-check

/**
 * Event by calling which will be called the chain of fubctions subscribed on the event
 *
 * @export
 * @class Event
 */
export class Event {
	/**
	 * @param {{ callback: Function, priority: number }[]} [queue=[]]
	 * @param {Function[]} [oneTimeQueue=[]]
	 * @memberof Event
	 */
	constructor(queue = [], oneTimeQueue = []) {
		/** @private */
		this._queue = [...queue].sort((a, b) => a.priority - b.priority);
		/** @private */
		this._oneTimeQueue = oneTimeQueue.slice();
		/** @type {Subscription[]} @private */
		this._subscriptions = [];
	}

	/**
	 * Cancel all subscribtions on the event
	 *
	 * @returns {Event}
	 * @memberof Event
	 */
	unsubscribeAll() {
		this._subscriptions.forEach(subscription => subscription.unsubscribe());

		this._queue = [];
		this._oneTimeQueue = [];
		this._subscriptions = [];

		return this;
	}

	/**
	 * Cancel the subscribtion of the function on the event
	 * 
	 * WARNING: It's better to use Subscription.unsubscribe(). If function is unsubscribed directly from the Event class,
	 * the instance of the subscribtion will remain in memory.
	 *
	 * @hidden
	 * @param {Function} action Функция
	 * @returns {Event}
	 * @memberof Event
	 */
	_unsubscribe(action) {
		this._queue = this._queue.filter(a => a.callback !== action);
		this._oneTimeQueue = this._oneTimeQueue.filter(a => a !== action);
		this._subscriptions = this._subscriptions.filter(sub => sub._action !== action);

		return this;
	}

	/**
	 * Subscribe function on the event
	 *
	 * @param {Function} action Function
	 * @param {number} [priority=0] Call priority. The less number, the earlier subscription will be called
	 * @returns {Subscription}
	 * @memberof Event
	 */
	subscribe(action, priority = 0) {
		this._queue.push({ callback: action, priority: priority });
		this._queue.sort((a, b) => a.priority - b.priority);

		let subscription = new Subscription(this, action);
		this._subscriptions.push(subscription)
		return subscription;
	}


	/**
	 * Subscribe function on one-time activation of the event
	 *
	 * @memberof Event
	 */
	subscribeOnOne(/** @type {Function} */ action) {
		this._oneTimeQueue.push(action);
		let subscription = new Subscription(this, action);
		this._subscriptions.push(subscription)
		return subscription;
	}

	/**
	 * Call the event
	 *
	 * @param {*} params Arguments for function-subscribers
	 * @returns {any[]}
	 * @memberof Event
	 */
	fire(...params) {
		this._oneTimeQueue.forEach(action => action(...params));
		this._oneTimeQueue = [];
		return this._queue.map(action => action.callback(...params))
	}
}

export class Subscription {
	/**
	 * Creates an instance of Subscription.
	 * @param {Event} event
	 * @param {Function} action
	 * @memberof Subscription
	 */
	constructor(event, action) {
		/** @private */
		this._event = event;
		this._action = action;
	}

	/**
	 * Cancel the subscribtion of the function on the event
	 *
	 * @memberof Subscription
	 */
	unsubscribe() {
		if (this._event === null) return;
		this._event._unsubscribe(this._action);
		this._event = null;
		this._action = null;
	}
}
