import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, register as registerApi, getMe } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const login = async (credentials) => {
    const res = await loginApi(credentials)
    user.value = res.user
    token.value = res.token
    localStorage.setItem('user', JSON.stringify(res.user))
    localStorage.setItem('token', res.token)
    return res
  }

  const register = async (data) => {
    const res = await registerApi(data)
    user.value = res.user
    token.value = res.token
    localStorage.setItem('user', JSON.stringify(res.user))
    localStorage.setItem('token', res.token)
    return res
  }

  const logout = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  const fetchUser = async () => {
    if (token.value) {
      try {
        const res = await getMe()
        user.value = res.user
        localStorage.setItem('user', JSON.stringify(res.user))
      } catch {
        logout()
      }
    }
  }

  return { user, token, isLoggedIn, isAdmin, login, register, logout, fetchUser }
})
