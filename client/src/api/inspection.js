import api from './index'

export const getInspections = (params) => api.get('/inspections', { params })

export const getInspection = (id) => api.get(`/inspections/${id}`)

export const createInspection = (data) => api.post('/inspections', data)

export const updateInspection = (id, data) => api.put(`/inspections/${id}`, data)

export const deleteInspection = (id) => api.delete(`/inspections/${id}`)

export const copyInspection = (id) => api.post(`/inspections/${id}/copy`)

export const exportInspection = (id) => {
  return api.get(`/inspections/${id}/export`, { responseType: 'blob' })
}
