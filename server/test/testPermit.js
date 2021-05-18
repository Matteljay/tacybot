//import axios from "axios";
const axios = require('axios');
axios.defaults.timeout = 8000;
axios.defaults.withCredentials = false;

const base = 'http://localhost:5000'
const root = '/api/permit'
const token = 
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJJSXdmQ2dhTzZ2ZjBEbTRNIiwiaWF0IjoxNjE0MzUxNjQ3LCJleHAiOjE2MTQ4MDE2NDd9.hflwavwK-0AjhDyHdzZRPvi_eOBls2rSQPjsKgLguyc'
//'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJTa2FnT3UyQkFnSzI3SncxIiwiaWF0IjoxNjEzMTI1MzAwLCJleHAiOjE2MTM1NzUzMDB9.hp3RuoYBsK87ft4lIilEAA_VC6QNU1dr0emyT9TQuIU'

const testChangeUserinfo = async () => {
  const headers = {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    }
  }
  //const payload = { password: 'qqqqqq', email: 'mario@admin.one', newPassword: 'qqqqqq', name: 'Piet' }
  const payload = { password: 'qqqqqq', name: 'LALALA', email: 'aa@bb.cc' }
  try {
    const response = await axios.post(base + root + '/changeUserinfo', payload, headers)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

const testResetPass = async () => {
  const headers = {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    }
  }
  const payload = { email: 'piet2@admin.one' }
  try {
    const response = await axios.post(base + root + '/resetPass', payload, headers)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

const testToggleApproved = async () => {
  const headers = {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    }
  }
  const payload = { email: 'jan@admin.one' }
  try {
    const response = await axios.post(base + root + '/toggleApproved', payload, headers)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

const testLogin = async () => {
  //const payload = { email: 'mario@admin.one', password: 'qqqqqq' }
  const payload = { email: 'user@admin.not', password: 'qqqqqq' }
  try {
    const response = await axios.post(base + root + '/login', payload)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

const testCreateUser = async () => {
  const payload = { email: 'site@admin.one', password: 'qqqqqq', name: 'Super Mario' }
  try {
    const response = await axios.post(base + root + '/createUser', payload)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

const testGetRoot = async () => {
  const headers = {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token
    }
  }
  try {
    const response = await axios.get(base + root + '/wipeDB', headers)
    console.log('Status: ' + response.status)
    console.log(response.data)
  } catch (err) {
    console.log(err.message)
    console.log(err.response.data)
  }
}

testChangeUserinfo()
//testResetPass()
//testToggleApproved()
//testLogin()
//testCreateUser()
//testGetRoot()

// EOF

