/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.statemachine;

/**
 * Interface of state changer class
 * 
 * @see StateMachine
 * @author t.gdala
 *
 * @param <S>
 *            Enumerator with all possible states
 */
public interface StateChanger<S> {
	/**
	 * Implementation of this method should change state from current to new
	 * 
	 * @param state
	 *            new state
	 * @param data
	 *            data associated with state change. It can be null if there are
	 *            no data.
	 */
	void gotoState(S state, Object data);
}
