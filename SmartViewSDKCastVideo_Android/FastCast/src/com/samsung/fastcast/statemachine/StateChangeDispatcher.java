/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast.statemachine;

import java.util.ArrayList;
import java.util.List;

/**
 * Helper dispatcher class for gather all listeners listen for state changes.
 * 
 * @author t.gdala
 *
 * @param <S>
 *            Enumerator with all possible states
 */
public class StateChangeDispatcher<S> {
	private List<StateChangeListener<S>> _list = new ArrayList<StateChangeListener<S>>();

	/**
	 * Adds new state change listener
	 * 
	 * @param listener
	 *            {@link StateChangeListener} to add
	 */
	public void addListener(StateChangeListener<S> listener) {
		if (!_list.contains(listener)) {
			_list.add(listener);
		}
	}

	/**
	 * Removes existing state change listener
	 * 
	 * @param listener
	 *            {@link StateChangeListener} to remove
	 */
	public void removeListener(StateChangeListener<S> listener) {
		_list.remove(listener);
	}

	/**
	 * Removes all state change listeners
	 */
	public void cleanAllListeners() {
		_list.clear();
	}

	/**
	 * Invokes stateChanged method on all listeners.
	 * 
	 * @param args
	 *            {@link StateChangeArgs} arguments of state change
	 */
	public void invokeStateChanged(StateChangeArgs<S> args) {
		for (StateChangeListener<S> listener : _list)
			listener.stateChanged(args);
	}

}
