import api from './index';

export const exportBackup = () => {
  return api.get('/backup/export', { responseType: 'blob' });
};

export const importBackup = (formData) => {
  return api.post('/backup/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};
