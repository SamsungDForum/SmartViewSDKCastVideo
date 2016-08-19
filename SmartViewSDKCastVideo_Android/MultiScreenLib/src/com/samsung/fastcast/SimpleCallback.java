/*
 * Copyright (c) 2015 Samsung Electronics, Inc.
 * All rights reserved.
 */

package com.samsung.fastcast;

/**
 * Simple callback to run some code after some action is done In run method
 * argument there will be result of action if any or null if there is no
 * important result.
 * 
 * @author m.gajewski
 *
 * @param <T>
 */
public interface SimpleCallback<T> {
    /**
     * Called after action is done
     * 
     * @param result
     *            result of performed action
     */
    void run(T result);
}
