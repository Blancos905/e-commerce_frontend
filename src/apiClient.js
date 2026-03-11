import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8083/api',
});

export default apiClient;

