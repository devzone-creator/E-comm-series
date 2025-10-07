import express from 'express';
import AuthService from '../services/authService.js';
import { 
  validateRegistration, 
  validateLogin, 
  validate