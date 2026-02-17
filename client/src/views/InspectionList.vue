<template>
  <div class="inspection-list">
    <el-card shadow="hover" class="list-card">
      <template #header>
        <div class="card-header">
          <span>巡检记录</span>
          <el-button type="primary" @click="$router.push('/inspections/new')">
            <el-icon><Plus /></el-icon>
            新建巡检
          </el-button>
        </div>
      </template>

      <el-table :data="inspections" v-loading="loading" height="100%" style="width: 100%">
        <el-table-column prop="title" label="巡检标题" min-width="200" />
        <el-table-column label="使用模板" width="100">
          <template #default="{ row }">
            {{ row.template?.name || '无' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
              {{ row.status === 'completed' ? '已完成' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="巡检人" width="100" align="center">
          <template #default="{ row }">
            {{ row.inspector?.username || row.creator?.username }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160" align="center">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/inspections/${row.id}/edit`)">
              {{ row.status === 'completed' ? '查看' : '编辑' }}
            </el-button>
            <el-button link type="success" @click="handleCopy(row.id)">
              复制
            </el-button>
            <el-tooltip 
              :content="row.status === 'completed' ? '导出Word文档' : '请先完成巡检'"
              placement="top"
            >
              <span>
                <el-button 
                  link 
                  type="success" 
                  @click="handleExport(row)"
                  :disabled="row.status !== 'completed'"
                >
                  导出
                </el-button>
              </span>
            </el-tooltip>
            <el-popconfirm title="确定删除此记录吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { getInspections, deleteInspection, copyInspection } from '../api/inspection'
import api from '../api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const inspections = ref([])

const formatDate = (date) => new Date(date).toLocaleString('zh-CN')

const fetchInspections = async () => {
  loading.value = true
  try {
    inspections.value = await getInspections()
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id) => {
  try {
    await deleteInspection(id)
    ElMessage.success('删除成功')
    fetchInspections()
  } catch {}
}

const handleExport = async (row) => {
  try {
    const response = await api.get(`/inspections/${row.id}/export`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${row.title}.docx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

const handleCopy = async (id) => {
  try {
    const newRecord = await copyInspection(id)
    ElMessage.success('复制成功')
    router.push(`/inspections/${newRecord.id}/edit?mode=copy`)
  } catch {
    ElMessage.error('复制失败')
  }
}

onMounted(fetchInspections)
</script>

<style scoped>
.inspection-list {
  animation: fadeIn 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 10px 20px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
