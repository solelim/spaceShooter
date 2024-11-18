import { Event } from './Event';

/**
 * @class GameStateMachine
 */
class GameStateMachine {
    constructor() {
        this.states = {};
        this.currentState = null;
    }

    addState(name) {
        const state = new GameState(name, this); 
        this.states[name] = state;
        return state;
    }

    setState(name) {
        if (this.currentState) {
            this.currentState.exit();
        }

        this.currentState = this.states[name];

        if (this.currentState) {
            this.currentState.enter();
        }
    }
}

/**
 * @class GameState
 */
class GameState {
    /**
     * @param {String} name
     * @param {GameStateMachine} stateMachine
     * @memberof GameState
     */
    constructor(name, stateMachine) {
        this.name = name;
        this.stateMachine = stateMachine;
        this.onEnterEvent = new Event();
        this.onExitEvent = new Event();
    }

    onEnter(callback) {
        this.onEnterEvent.subscribe(callback);
        return this;
    }

    onExit(callback) {
        this.onExitEvent.subscribe(callback);
        return this;
    }
    /**
     * @readonly
     * @returns GameStateMachine
     * @memberof GameState
     */
    get ready() {
        return this.stateMachine;
    }

    enter() {
        console.log(`Entering ${this.name} state...`);
        this.onEnterEvent.fire();
    }

    exit() {
        console.log(`Exiting ${this.name} state...`);
        this.onExitEvent.fire();
    }
}
export default GameStateMachine;
