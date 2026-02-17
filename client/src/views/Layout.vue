<template>
  <div class="layout">
    <el-container>
      <el-header class="header">
        <div class="logo">机房设备巡检平台</div>
        <el-menu
          mode="horizontal"
          :default-active="activeMenu"
          :ellipsis="false"
          background-color="transparent"
          text-color="#fff"
          active-text-color="#ffd04b"
          router
        >
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item v-if="userStore.isAdmin" index="/templates">模板管理</el-menu-item>
          <el-menu-item index="/inspections">巡检记录</el-menu-item>
        </el-menu>
        <div class="user-info">
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32">{{ userStore.user?.username?.[0]?.toUpperCase() }}</el-avatar>
              <span class="username">{{ userStore.user?.username }}</span>
              <el-tag size="small" :type="userStore.isAdmin ? 'danger' : 'info'">
                {{ userStore.isAdmin ? '管理员' : '工程师' }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="clearImages">
                  <el-icon><Delete /></el-icon>
                  清空我的图片
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Delete, SwitchButton } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const deleting = ref(false)

const activeMenu = computed(() => {
  if (route.path.startsWith('/templates')) return '/templates'
  if (route.path.startsWith('/inspections')) return '/inspections'
  return route.path
})

const handleCommand = async (command) => {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (command === 'clearImages') {
    try {
      await ElMessageBox.confirm(
        '此操作将删除您所有巡检记录中的截图，但保留巡检数据和结果。此操作不可恢复，是否继续？',
        '警告',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )
      
      deleting.value = true
      const loadingMsg = ElMessage({
        message: '正在删除图片...',
        type: 'info',
        duration: 0,
        icon: Delete
      })
      
      try {
        const response = await api.delete('/upload/user-images')
        loadingMsg.close()
        
        ElMessage({
          message: `删除完成！共删除 ${response.deletedCount} 张图片`,
          type: 'success',
          duration: 3000
        })
        
        // 刷新当前页面
        if (route.path.startsWith('/inspections')) {
          router.go(0)
        }
      } catch (error) {
        loadingMsg.close()
        ElMessage.error('删除失败，请稍后重试')
      } finally {
        deleting.value = false
      }
    } catch {
      // 用户取消
    }
  }
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  margin-right: 40px;
  white-space: nowrap;
}

.el-menu {
  flex: 1;
  border-bottom: none !important;
}

.el-menu-item {
  font-size: 15px;
}

.user-info {
  margin-left: auto;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #fff;
}

.username {
  font-size: 14px;
}

.el-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  padding: 20px;
  background: #f5f7fa;
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
</style>
