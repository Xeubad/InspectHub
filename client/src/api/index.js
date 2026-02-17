import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const api = axios.create({
  baseURL: '/api',
  timeout: 600000 // 【关键修复】延长至 10 分钟，支持大文件备份恢复
})

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
      return response.data
    }
    return response.data
  },
  error => {
    const message = error.response?.data?.message || '请求失败'
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default api
