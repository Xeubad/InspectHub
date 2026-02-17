import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'templates',
        name: 'TemplateList',
        component: () => import('../views/TemplateList.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'templates/new',
        name: 'TemplateCreate',
        component: () => import('../views/TemplateEditTwoColumn.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'templates/:id/edit',
        name: 'TemplateEdit',
        component: () => import('../views/TemplateEditTwoColumn.vue'),
        meta: { adminOnly: true }
      },
      {
        path: 'inspections',
        name: 'InspectionList',
        component: () => import('../views/InspectionList.vue')
      },
      {
        path: 'inspections/new',
        name: 'InspectionCreate',
        component: () => import('../views/InspectionEdit.vue')
      },
      {
        path: 'inspections/:id/edit',
        name: 'InspectionEdit',
        component: () => import('../views/InspectionEdit.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
  } else if (to.meta.adminOnly && !userStore.isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router
