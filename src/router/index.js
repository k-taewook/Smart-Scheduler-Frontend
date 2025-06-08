import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import Calendar from '../view/Calendar.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: Calendar
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})



export default router
