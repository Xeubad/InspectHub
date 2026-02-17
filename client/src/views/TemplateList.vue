<template>
  <div class="template-list">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>模板管理</span>
          <el-button type="primary" @click="$router.push('/templates/new')">
            <el-icon><Plus /></el-icon>
            新建模板
          </el-button>
        </div>
      </template>

      <div class="template-grid">
        <div 
          v-for="template in templates" 
          :key="template.id"
          class="template-card"
        >
          <div class="template-header">
            <div class="template-title">
              <h3>{{ template.name }}</h3>
              <el-tag size="small" type="info">{{ getTemplateType(template) }}</el-tag>
            </div>
            <div class="template-stats">
              <div class="stat-item">
                <el-icon><Monitor /></el-icon>
                <span>{{ getDeviceCount(template) }} 设备</span>
              </div>
              <div class="stat-item">
                <el-icon><Document /></el-icon>
                <span>{{ getCheckItemCount(template) }} 项</span>
              </div>
              <div class="stat-item">
                <el-icon><Warning /></el-icon>
                <span>{{ getDynamicCount(template) }} 必更</span>
              </div>
            </div>
          </div>
          
          <div class="template-description">
            <p>{{ template.description || '暂无描述' }}</p>
          </div>
          
          <div class="template-footer">
            <div class="template-meta">
              <span class="creator">创建者: {{ template.creator?.username }}</span>
              <span class="date">{{ formatDate(template.createdAt) }}</span>
            </div>
            <div class="template-actions">
              <el-button 
                v-if="userStore.isAdmin" 
                size="small" 
                type="primary" 
                @click="handleEdit(template.id)"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="success" @click="handleCopy(template)">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
              <el-popconfirm 
                v-if="userStore.isAdmin"
                title="确定删除此模板吗？" 
                @confirm="handleDelete(template.id)"
              >
                <template #reference>
                  <el-button size="small" type="danger">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="templates.length === 0 && !loading" class="empty-state">
          <el-icon class="empty-icon"><DocumentAdd /></el-icon>
          <p>暂无模板</p>
          <el-button type="primary" @click="$router.push('/templates/new')">
            <el-icon><Plus /></el-icon>
            创建第一个模板
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Plus, Monitor, Document, Warning, Edit, CopyDocument, Delete, DocumentAdd } from '@element-plus/icons-vue'
import { getTemplates, deleteTemplate } from '../api/template'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const templates = ref([])

const formatDate = (date) => new Date(date).toLocaleString('zh-CN')

const fetchTemplates = async () => {
  loading.value = true
  try {
    templates.value = await getTemplates()
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id) => {
  try {
    await deleteTemplate(id)
    ElMessage.success('删除成功')
    fetchTemplates()
  } catch (error) {
    console.error('Delete template error:', error)
    ElMessage.error('删除失败：' + (error.response?.data?.message || error.message))
  }
}

const handleEdit = (templateId) => {
  // 检查权限
  const userStore = useUserStore()
  if (!userStore.isAdmin) {
    ElMessage.error('您没有权限编辑模板')
    return
  }
  
  router.push(`/templates/${templateId}/edit`)
}

const handleCopy = (template) => {
  // 将模板数据存储到 sessionStorage
  const copyData = {
    name: `${template.name} - 复制`,
    description: template.description,
    items: template.items?.map(item => ({
      name: item.name,
      description: item.description || '',
      level: item.level || 1,
      code: item.code || '',
      isGroup: Boolean(item.isGroup),
      isDynamic: Boolean(item.isDynamic),
      parentId: null // 复制时清除 parentId
    })) || []
  }
  sessionStorage.setItem('templateCopyData', JSON.stringify(copyData))
  
  // 跳转到新建页面
  router.push('/templates/new')
  ElMessage.success('已加载模板数据，请修改名称后保存')
}

// 获取模板类型
const getTemplateType = (template) => {
  const deviceCount = getDeviceCount(template)
  if (deviceCount === 0) return '空模板'
  if (deviceCount === 1) return '单设备'
  if (deviceCount <= 3) return '小型模板'
  if (deviceCount <= 6) return '中型模板'
  return '大型模板'
}

// 获取设备数量
const getDeviceCount = (template) => {
  return template.items?.filter(item => item.level === 1).length || 0
}

// 获取检查项数量
const getCheckItemCount = (template) => {
  return template.items?.filter(item => item.level >= 2 && !Boolean(item.isGroup)).length || 0
}

// 获取必更项数量
const getDynamicCount = (template) => {
  return template.items?.filter(item => Boolean(item.isDynamic) && !Boolean(item.isGroup)).length || 0
}



onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.template-list {
  animation: fadeIn 0.3s ease;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
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

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  padding: 10px;
}

.template-card {
  background: white;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.template-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.template-header {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.template-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.template-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.template-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  opacity: 0.9;
}

.stat-item .el-icon {
  font-size: 16px;
}

.template-description {
  padding: 15px 20px;
  min-height: 60px;
}

.template-description p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.template-footer {
  padding: 15px 20px;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.creator, .date {
  font-size: 12px;
  color: #909399;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 18px;
  margin-bottom: 20px;
}
</style>
