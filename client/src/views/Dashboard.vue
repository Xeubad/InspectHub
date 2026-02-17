<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon blue">
              <el-icon :size="32"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalInspections }}</div>
              <div class="stat-label">总巡检数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon orange">
              <el-icon :size="32"><Edit /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.draftCount }}</div>
              <div class="stat-label">草稿中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon green">
              <el-icon :size="32"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completedCount }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" size="large" @click="$router.push('/inspections/new')">
              <el-icon><Plus /></el-icon>
              新建巡检
            </el-button>
            <el-button size="large" @click="$router.push('/inspections')">
              <el-icon><List /></el-icon>
              查看记录
            </el-button>
            <el-button v-if="userStore.isAdmin" size="large" @click="$router.push('/templates')">
              <el-icon><Setting /></el-icon>
              管理模板
            </el-button>
            <el-button v-if="userStore.isAdmin" size="large" type="warning" @click="handleBackup">
              <el-icon><Download /></el-icon>
              导出备份
            </el-button>
            <el-upload
              v-if="userStore.isAdmin"
              class="backup-import"
              action=""
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleImport"
              accept=".zip"
            >
              <el-button size="large" type="danger" :loading="importing">
                <el-icon><Upload /></el-icon>
                恢复备份
              </el-button>
            </el-upload>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px; flex: 1; min-height: 0;">
      <el-col :span="24" style="height: 100%;">
        <el-card shadow="hover" class="recent-card">
          <template #header>
            <div class="card-header">
              <span>最近巡检</span>
              <el-button link type="primary" @click="$router.push('/inspections')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentInspections" height="100%" style="width: 100%" v-loading="loading">
            <el-table-column prop="title" label="标题" min-width="200" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
                  {{ row.status === 'completed' ? '已完成' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="180" align="center">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="$router.push(`/inspections/${row.id}/edit`)">
                  {{ row.status === 'completed' ? '查看' : '继续' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Document, Edit, CircleCheck, Plus, List, Setting, Download, Upload } from '@element-plus/icons-vue'
import { getInspections } from '../api/inspection'
import { exportBackup, importBackup } from '../api/backup'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const loading = ref(false)
const recentInspections = ref([])
const stats = reactive({
  totalInspections: 0,
  draftCount: 0,
  completedCount: 0
})

const importing = ref(false)

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const fetchData = async () => {
  loading.value = true
  try {
    const data = await getInspections()
    recentInspections.value = data.slice(0, 5)
    stats.totalInspections = data.length
    stats.draftCount = data.filter(i => i.status === 'draft').length
    stats.completedCount = data.filter(i => i.status === 'completed').length
  } finally {
    loading.value = false
  }
}

const handleBackup = async () => {
  try {
    ElMessage.info('正在生成备份，请稍候...')
    const response = await exportBackup()
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().split('T')[0]
    link.setAttribute('download', `巡检平台备份_${timestamp}.zip`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ElMessage.success('备份导出成功')
  } catch (error) {
    console.error('Backup error:', error)
    ElMessage.error('导出备份失败')
  }
}

const handleImport = async (file) => {
  try {
    await ElMessageBox.confirm(
      '恢复备份将导入所有历史数据，建议先导出当前备份以防万一。确定要继续吗？',
      '警告',
      { 
        confirmButtonText: '确定导入', 
        cancelButtonText: '取消', 
        type: 'warning' 
      }
    )

    importing.value = true
    const formData = new FormData()
    formData.append('file', file.raw)
    
    await importBackup(formData)
    ElMessage.success('数据恢复成功！')
    // 刷新数据
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Import error:', error)
      ElMessage.error('恢复备份失败：' + (error.response?.data?.message || error.message))
    }
  } finally {
    importing.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stat-card {
  transition: transform 0.3s ease;
}

.recent-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.recent-card .el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 0 20px 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.green { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
</style>
