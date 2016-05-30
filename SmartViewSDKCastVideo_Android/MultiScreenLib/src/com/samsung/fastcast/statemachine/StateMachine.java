/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.statemachine;

/**
 * Simple state machine implementation. It is always in some state. It can
 * change state from one to another and will invoke state change event which
 * will be dispatched to all listeners
 * 
 * @author t.gdala
 *
 * @param <S>
 *            Enumerator with all possible states
 */
public class StateMachine<S> implements StateChanger<S> {

	private S _default;
	private S _current_state;

	/**
	 * Invoke event when machine is leaving state
	 * 
	 * @param args
	 *            state change arguments
	 */
	protected void invokeStateEnds(StateChangeArgs<S> args) {
		onStateEnds.invokeStateChanged(args);
	}

	/**
	 * Invoke event when machine is entering to state
	 * 
	 * @param args
	 *            state change arguments
	 */
	protected void invokeStateStarts(StateChangeArgs<S> args) {
		onStateStarts.invokeStateChanged(args);
	}

	/**
	 * Dispatcher for leaving state events. You can add your listener to it to
	 * get known about state leaving events.
	 */
	public StateChangeDispatcher<S> onStateEnds = new StateChangeDispatcher<S>();

	/**
	 * Dispatcher for entering state events. You can add your listener to it to
	 * get known about state enter events.
	 */
	public StateChangeDispatcher<S> onStateStarts = new StateChangeDispatcher<S>();

	/**
	 * Implementation of gotoStates method. It changes state and invokes
	 * dispatchers when leaving old state and entering new state
	 * 
	 * @see com.samsung.fastcast.statemachine.StateChanger#gotoState(java.lang.Object,
	 *      java.lang.Object)
	 */
	public void gotoState(S state, Object data) {
		if (_current_state != state) {
			StateChangeArgs<S> args = new StateChangeArgs<S>(_current_state, state, data);
			invokeStateEnds(args);
			_current_state = state;
			invokeStateStarts(args);
		}
	}

	/**
	 * Current state getter
	 * 
	 * @return Current state of this state machine
	 */
	public S getCurrentState() {
		return _current_state;
	}

	/**
	 * Default state setter. It sets default states of this state machine.
	 * Default state is the starting state.
	 */
	public void setDefaultState() {
		gotoState(_default, null);
	}

	/**
	 * StateMachine constructor. Makes StateMachine object and sets it default
	 * state as current.
	 * 
	 * @param default_state
	 *            default state of this machine.
	 */
	public StateMachine(S default_state) {
		_default = default_state;
		_current_state = _default;
	}
}
