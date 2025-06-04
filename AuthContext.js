import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token) setUserToken(token);
        if (userData) setUser(JSON.parse(userData));
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const refreshUser = async () => {
    if(!user) return;
    const res = await axios.get(`https://divine-x-production.up.railway.app/user/${user.email}`);
    await AsyncStorage.setItem('userData', JSON.stringify(res.data));
    setUser(res.data);
  };

  const login = async (email, password) => {
    try {
    const res = await axios.post('https://divine-x-production.up.railway.app/login', {email, password });

      const { token, user } = res.data;

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      setUserToken(token);
      setUser(user);
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else {
        throw new Error('Server error. Please try again later.');
      }
    }
  };

  const signup = async (data) => {
    try {
      const res = await axios.post('https://divine-x-production.up.railway.app/signup', data);
      const { token, user } = res.data;

      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      setUserToken(token);
      setUser(user);
      return true;
    } catch (error) {
      console.log('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUserToken(null);
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userToken, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
