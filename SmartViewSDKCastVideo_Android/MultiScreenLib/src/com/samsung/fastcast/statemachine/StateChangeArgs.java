/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.statemachine;

/**
 * StateMachine state change arguments. It has old state, new state and data
 * associated with state change
 * 
 * @author t.gdala
 *
 * @param <S>
 *            Enumerator type with all possible states
 */
public class StateChangeArgs<S> {
	/**
	 * Old state property
	 */
	public S state_old;

	/**
	 * New state property
	 */
	public S state_new;

	/**
	 * Optional data property
	 */
	public Object data;

	/**
	 * Object constructor
	 * 
	 * @param _old
	 *            old state
	 * @param _new
	 *            new state
	 * @param _data
	 *            additional data
	 */
	public StateChangeArgs(S _old, S _new, Object _data) {
		state_old = _old;
		state_new = _new;
		data = _data;
	}
}
