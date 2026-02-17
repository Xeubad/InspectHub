<template>
  <div class="template-edit">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑模板' : '新建模板' }}</span>
          <div class="header-actions">
            <el-button @click="$router.back()">返回</el-button>
          </div>
        </div>
      </template>

      <div class="edit-layout">
        <!-- 基本信息表单 -->
        <el-form 
          ref="formRef" 
          :model="form" 
          :rules="rules" 
          label-width="100px" 
          class="template-form"
        >
          <div class="template-form-header">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="模板名称" prop="name">
                  <el-input 
                    v-model="form.name" 
                    placeholder="请输入模板名称" 
                    maxlength="100"
                    show-word-limit
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="模板类型">
                  <el-select v-model="form.type" placeholder="选择模板类型" style="width: 100%;">
                    <el-option label="巡检模板" value="inspection" />
                    <el-option label="检查模板" value="check" />
                    <el-option label="自定义模板" value="custom" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="模板描述">
              <el-input 
                v-model="form.description" 
                type="textarea" 
                :rows="3" 
                placeholder="请输入模板描述..."
              />
            </el-form-item>
            <el-divider content-position="left">模板结构</el-divider>
          </div>
        </el-form>

        <div class="main-content">
          <!-- 左侧设备列表 - 缩小宽度，让名称显示更多 -->
          <div class="device-list">
            <div class="device-header">
              <h3>设备列表</h3>
              <span class="device-count">{{ deviceGroups.length }} 台设备</span>
            </div>
            <el-scrollbar class="device-scrollbar">
              <div 
                v-for="(device, deviceIndex) in deviceGroups" 
                :key="device.id"
                :class="['device-item', { 'active': activeDeviceIndex === deviceIndex }]"
                @click="selectDevice(deviceIndex)"
              >
                <div class="device-drag-handle">
                  <el-icon><Rank /></el-icon>
                </div>
                <div class="device-code">{{ generateGroupCode(deviceIndex) }}</div>
                <div class="device-name" :title="device.name || '未命名设备'">{{ device.name || '未命名设备' }}</div>
                <div class="device-actions">
                  <el-button 
                    size="small" 
                    type="success" 
                    @click.stop="duplicateDevice(deviceIndex)"
                    title="复制设备"
                  >
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click.stop="deleteDevice(deviceIndex)"
                    title="删除设备"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </el-scrollbar>
            <div class="device-footer">
              <el-button type="primary" @click="addDeviceGroup" style="width: 100%;">
                <el-icon><Plus /></el-icon>
                添加设备
              </el-button>
            </div>
          </div>

          <!-- 右侧检查项编辑区域 - 只显示选中设备的检查项 -->
          <div class="inspection-grid">
            <div v-if="activeDeviceIndex === null" class="empty-selection">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <h3>请选择设备</h3>
              <p>点击左侧设备查看和编辑检查项</p>
            </div>
            
            <template v-else>
              <div class="grid-header">
                <div class="device-info">
                  <el-icon class="device-icon"><Monitor /></el-icon>
                  <span class="device-code">{{ generateGroupCode(activeDeviceIndex) }}</span>
                  <el-input 
                    v-model="deviceGroups[activeDeviceIndex].name" 
                    placeholder="设备名称"
                    class="device-name-input"
                    :class="{ 'empty': !deviceGroups[activeDeviceIndex].name.trim() }"
                  />
                  <el-tag type="success" size="small">{{ getActiveDeviceItems().length }} 项</el-tag>
                </div>
                <div class="device-actions-header">
                  <el-button size="small" type="primary" @click="addCheckItem(activeDeviceIndex)">
                    <el-icon><Plus /></el-icon>
                    添加检查项
                  </el-button>
                </div>
              </div>

              <el-scrollbar class="grid-scrollbar">
                <div class="items-list">
                  <div 
                    v-for="(item, itemIndex) in getActiveDeviceItems()" 
                    :key="item.id"
                    class="inspection-item-row"
                    :class="{ 'is-group': item.isGroup, 'is-dynamic': item.isDynamic }"
                  >
                    <span class="item-index">{{ generateItemCode(activeDeviceIndex, itemIndex) }}</span>
                    <el-input
                      v-model="item.name"
                      placeholder="检查项名称"
                      class="item-name-input"
                      :class="{ 'empty': !item.name.trim() }"
                    />
                    <el-input
                      v-model="item.description"
                      placeholder="描述(可选)"
                      class="item-desc-input"
                    />
                    <div class="item-controls">
                      <el-tooltip content="分组标题" placement="top">
                        <el-checkbox 
                          v-model="item.isGroup" 
                          size="small"
                          @change="handleGroupChange(item)"
                        >分组</el-checkbox>
                      </el-tooltip>
                      <el-tooltip content="每次必更" placement="top">
                        <el-checkbox 
                          v-model="item.isDynamic" 
                          size="small"
                          :disabled="item.isGroup"
                        >必更</el-checkbox>
                      </el-tooltip>
                    </div>
                    <el-button
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click="deleteItem(activeDeviceIndex, itemIndex)"
                    />
                  </div>

                  <!-- 设备无检查项时的空状态 -->
                  <div v-if="getActiveDeviceItems().length === 0" class="empty-items">
                    <el-icon><InfoFilled /></el-icon>
                    <p>该设备暂无检查项</p>
                    <el-button size="small" type="primary" @click="addCheckItem(activeDeviceIndex)">
                      <el-icon><Plus /></el-icon>
                      添加检查项
                    </el-button>
                  </div>
                </div>
              </el-scrollbar>
            </template>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="footer-actions">
          <el-button @click="$router.back()">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSubmit" 
            :loading="submitting"
            size="large"
          >
            <el-icon><Check /></el-icon>
            {{ isEdit ? '保存修改' : '创建模板' }}
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Plus, Delete, CopyDocument, Monitor, Folder, Document, 
  InfoFilled, Check, Rank 
} from '@element-plus/icons-vue'
import { getTemplate, createTemplate, updateTemplate } from '../api/template'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import Sortable from 'sortablejs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 权限检查
const checkPermission = () => {
  if (!userStore.isAdmin) {
    ElMessage.error('您没有权限编辑模板')
    router.push('/templates')
    return false
  }
  return true
}

const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const isEdit = computed(() => !!route.params.id)
const activeDeviceIndex = ref(null)
const deviceListRef = ref(null)

// 表单数据
const form = reactive({
  name: '',
  description: '',
  type: 'inspection'
})

// 设备分组数据
const deviceGroups = ref([])

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

// 生成设备组编号
const generateGroupCode = (index) => {
  return `${index + 1}.1`
}

// 生成检查项编号（恢复原来的格式）
const generateItemCode = (groupIndex, itemIndex) => {
  return `${groupIndex + 1}.1.${itemIndex + 1}`
}

// 选择设备
const selectDevice = (index) => {
  activeDeviceIndex.value = index
}

// 获取当前选中设备的检查项
const getActiveDeviceItems = () => {
  if (activeDeviceIndex.value === null || !deviceGroups.value[activeDeviceIndex.value]) {
    return []
  }
  return deviceGroups.value[activeDeviceIndex.value].items || []
}

// 获取所有设备的检查项总数
const getTotalItemCount = () => {
  return deviceGroups.value.reduce((total, device) => {
    return total + (device.items ? device.items.length : 0)
  }, 0)
}

// 添加设备组
const addDeviceGroup = () => {
  const newGroup = {
    id: Date.now(),
    name: '',
    items: [],
    collapsed: false
  }
  deviceGroups.value.push(newGroup)
  // 自动选中新添加的设备
  activeDeviceIndex.value = deviceGroups.value.length - 1
  ElMessage.success('已添加新设备')
}

// 删除设备
const deleteDevice = async (index) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个设备及其所有检查项吗？',
      '确认删除',
      { type: 'warning' }
    )
    deviceGroups.value.splice(index, 1)
    // 如果删除的是当前选中的设备，清空选中状态
    if (activeDeviceIndex.value === index) {
      activeDeviceIndex.value = null
    } else if (activeDeviceIndex.value > index) {
      activeDeviceIndex.value--
    }
    ElMessage.success('设备已删除')
  } catch {
    // 用户取消
  }
}

// 复制设备
const duplicateDevice = (index) => {
  const deviceToCopy = deviceGroups.value[index]
  const newDevice = {
    id: Date.now(),
    name: `${deviceToCopy.name} - 副本`,
    items: deviceToCopy.items.map(item => ({
      ...JSON.parse(JSON.stringify(item)),
      id: Date.now() + Math.random()
    })),
    collapsed: false
  }
  deviceGroups.value.splice(index + 1, 0, newDevice)
  activeDeviceIndex.value = index + 1
  ElMessage.success('设备已复制')
}

// 添加检查项
const addCheckItem = (deviceIndex) => {
  if (deviceIndex === undefined || deviceIndex === null) return
  
  const newItem = {
    id: Date.now(),
    name: '',
    description: '',
    isGroup: false,
    isDynamic: false
  }
  deviceGroups.value[deviceIndex].items.push(newItem)
  ElMessage.success('已添加检查项')
}

// 删除检查项
const deleteItem = async (deviceIndex, itemIndex) => {
  try {
    await ElMessageBox.confirm('确定要删除这个检查项吗？', '确认删除', { type: 'warning' })
    deviceGroups.value[deviceIndex].items.splice(itemIndex, 1)
    ElMessage.success('检查项已删除')
  } catch {
    // 用户取消
  }
}

// 复制检查项
const duplicateItem = (deviceIndex, itemIndex) => {
  const itemToCopy = deviceGroups.value[deviceIndex].items[itemIndex]
  const newItem = {
    ...JSON.parse(JSON.stringify(itemToCopy)),
    id: Date.now()
  }
  deviceGroups.value[deviceIndex].items.splice(itemIndex + 1, 0, newItem)
  ElMessage.success('检查项已复制')
}

// 添加子项
const addSubItem = (deviceIndex, itemIndex) => {
  addCheckItem(deviceIndex)
}

// 分组状态变化处理
const handleGroupChange = (item) => {
  if (item.isGroup) {
    item.isDynamic = false
  }
}

// 提交表单
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 验证设备分组
  if (deviceGroups.value.length === 0) {
    ElMessage.warning('请至少添加一个设备')
    return
  }

  // 验证每个设备都有名称和检查项
  for (let i = 0; i < deviceGroups.value.length; i++) {
    const device = deviceGroups.value[i]
    if (!device.name.trim()) {
      ElMessage.warning(`第${i + 1}个设备需要填写名称`)
      return
    }
    if (device.items.length === 0) {
      ElMessage.warning(`第${i + 1}个设备需要至少一个检查项`)
      return
    }
    for (let j = 0; j < device.items.length; j++) {
      const item = device.items[j]
      if (!item.name.trim()) {
        ElMessage.warning(`第${i + 1}设备第${j + 1}项需要填写名称`)
        return
      }
    }
  }

  submitting.value = true
  try {
    // 构造提交数据
    const submitData = {
      name: form.name,
      description: form.description,
      type: form.type,
      items: []
    }

    // 转换设备分组为扁平化结构
    let itemIndex = 0
    deviceGroups.value.forEach((device, deviceIndex) => {
      // 添加设备（level 1）
      submitData.items.push({
        name: device.name,
        description: '',
        level: 1,
        code: generateGroupCode(deviceIndex),
        isGroup: true,
        isDynamic: false,
        sortOrder: itemIndex++
      })

      // 添加检查项（level 2）
      device.items.forEach((item, itemIndexInDevice) => {
        submitData.items.push({
          name: item.name,
          description: item.description,
          level: 2,
          code: generateItemCode(deviceIndex, itemIndexInDevice),
          isGroup: item.isGroup,
          isDynamic: item.isDynamic,
          sortOrder: itemIndex++
        })
      })
    })

    if (isEdit.value) {
      await updateTemplate(route.params.id, submitData)
      ElMessage.success('模板更新成功')
    } else {
      await createTemplate(submitData)
      ElMessage.success('模板创建成功')
    }
    
    router.push('/templates')
  } catch (error) {
    ElMessage.error('操作失败：' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

// 加载模板数据（编辑模式）
const loadTemplate = async () => {
  if (!isEdit.value) return
  
  loading.value = true
  try {
    const data = await getTemplate(route.params.id)
    form.name = data.name || ''
    form.description = data.description || ''
    form.type = data.type || 'inspection'

    // 转换扁平化数据为分组结构
    if (data.items && data.items.length > 0) {
      let currentDevice = null
      data.items.forEach(item => {
        if (item.level === 1) {
          // 设备
          currentDevice = {
            id: item.id || Date.now(),
            name: item.name,
            items: [],
            collapsed: false
          }
          deviceGroups.value.push(currentDevice)
        } else if (item.level === 2 && currentDevice) {
          // 检查项
          currentDevice.items.push({
            id: item.id || Date.now(),
            name: item.name,
            description: item.description,
            isGroup: item.isGroup,
            isDynamic: item.isDynamic
          })
        }
      })
    }
    
    ElMessage.success('模板加载成功')
  } catch (error) {
    ElMessage.error('加载模板失败：' + error.message)
    router.push('/templates')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!checkPermission()) return
  loadTemplate()
  
  // 初始化拖拽排序
  nextTick(() => {
    initSortable()
  })
})

// 初始化拖拽排序
const initSortable = () => {
  const el = document.querySelector('.device-scrollbar .el-scrollbar__view')
  if (!el) return
  
  Sortable.create(el, {
    animation: 150,
    handle: '.device-item',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex === newIndex) return
      
      // 更新数组顺序
      const movedItem = deviceGroups.value.splice(oldIndex, 1)[0]
      deviceGroups.value.splice(newIndex, 0, movedItem)
      
      // 更新选中索引
      if (activeDeviceIndex.value === oldIndex) {
        activeDeviceIndex.value = newIndex
      } else if (activeDeviceIndex.value > oldIndex && activeDeviceIndex.value <= newIndex) {
        activeDeviceIndex.value--
      } else if (activeDeviceIndex.value < oldIndex && activeDeviceIndex.value >= newIndex) {
        activeDeviceIndex.value++
      }
      
      ElMessage.success('设备顺序已更新')
    }
  })
}
</script>

<style scoped>
.template-edit {
  max-width: 100%;
  margin: 0 auto;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.3s ease;
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

.header-actions {
  display: flex;
  gap: 12px;
}

/* 深度修改 Element Plus 卡片样式以支持 Flex */
:deep(.el-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

:deep(.el-card__header) {
  flex-shrink: 0;
}

:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
}

.edit-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.template-form {
  flex-shrink: 0;
}

.template-form-header {
  margin-bottom: 20px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 20px;
  margin-top: 10px;
}

.device-list {
  width: 400px;
  flex-shrink: 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #e0e0e0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-header {
  margin-bottom: 15px;
  padding: 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.device-count {
  font-size: 12px;
  color: #666;
}

.device-scrollbar {
  flex: 1;
  overflow-y: auto;
}

.device-item {
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: move;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  background: white;
}

.device-item:hover {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.device-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.device-drag-handle {
  cursor: move;
  color: #909399;
  display: flex;
  align-items: center;
  font-size: 16px;
  flex-shrink: 0;
}

.device-item.active .device-drag-handle {
  color: white;
}

.device-item:hover .device-drag-handle {
  color: #409eff;
}

.device-item.active:hover .device-drag-handle {
  color: white;
}

.sortable-ghost {
  opacity: 0.4;
  background: #f0f2f5;
}

.sortable-chosen {
  cursor: move;
}

.sortable-drag {
  opacity: 0.8;
}

.device-code {
  font-weight: bold;
  min-width: 50px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.device-item.active .device-code {
  background: rgba(255, 255, 255, 0.3);
}

.device-name {
  flex: 1;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
  font-size: 14px;
}

.device-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.device-item:hover .device-actions {
  opacity: 1;
}

.device-footer {
  padding: 10px 0;
  border-top: 1px solid #e0e0e0;
  margin-top: 10px;
}

.inspection-grid {
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #e0e0e0;
}

.grid-header {
  margin-bottom: 15px;
  padding: 15px 20px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.device-icon {
  color: #667eea;
  font-size: 20px;
}

.device-name-input {
  flex: 1;
  max-width: 500px;
}

.device-name-input.empty :deep(.el-input__inner) {
  border-color: #f56c6c;
}

.device-actions-header {
  display: flex;
  gap: 8px;
}

.empty-selection {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  color: #c0c4cc;
}

.grid-scrollbar {
  height: calc(100% - 80px);
}

.items-list {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inspection-item-row {
  background: white;
  border-radius: 6px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  flex-wrap: nowrap;
}

.inspection-item-row:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.inspection-item-row.is-group {
  background: #f0f9ff;
  border-left: 4px solid #409eff;
}

.inspection-item-row.is-dynamic {
  background: #fdf6ec;
  border-left: 4px solid #e6a23c;
}

.item-index {
  font-family: monospace;
  font-weight: bold;
  color: #409eff;
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  min-width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.item-name-input {
  width: 280px;
  flex-shrink: 0;
}

.item-name-input.empty :deep(.el-input__inner) {
  border-color: #f56c6c;
}

.item-desc-input {
  width: 280px;
  flex-shrink: 0;
}

.item-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.empty-items {
  text-align: center;
  padding: 80px 20px;
  color: #999;
  background: white;
  border-radius: 8px;
  margin: 20px;
}

.empty-items .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #c0c4cc;
}

.empty-items p {
  margin: 0 0 20px 0;
  font-size: 14px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 20px 0 0 0;
  border-top: 1px solid #e0e6ed;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  
  .device-list {
    width: 100%;
    height: auto;
    margin-bottom: 20px;
  }
  
  .item-header {
    flex-wrap: wrap;
  }
  
  .item-controls {
    justify-content: center;
  }
}
</style>