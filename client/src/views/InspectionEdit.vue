<template>
  <div class="inspection-edit">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑巡检' : '新建巡检' }}</span>
          <div class="header-actions">
            <el-button @click="$router.back()">返回</el-button>
          </div>
        </div>
      </template>

      <div class="edit-layout">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" v-loading="loading" :disabled="isCompleted" class="inspection-form">
          <div class="inspection-form-header">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="巡检标题" prop="title">
                  <el-input v-model="form.title" placeholder="请输入巡检标题" :disabled="isCompleted" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="巡检时间" prop="inspectionTime">
                  <el-date-picker
                    v-model="form.inspectionTime"
                    type="datetime"
                    placeholder="选择巡检时间"
                    style="width: 100%"
                    format="YYYY-MM-DD HH:mm:ss"
                    :disabled="isCompleted"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="巡检人" prop="inspectorId">
                  <el-select
                    v-model="form.inspectorId"
                    placeholder="选择巡检人"
                    style="width: 100%"
                    :disabled="isCompleted"
                  >
                    <el-option
                      v-for="user in users"
                      :key="user.id"
                      :label="user.username"
                      :value="user.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="24">
                <el-form-item label="选择模板">
                  <el-select
                    v-model="form.templateId"
                    placeholder="选择模板(可选)"
                    clearable
                    style="width: 100%"
                    @change="handleTemplateChange"
                    :disabled="isEdit && form.status === 'completed'"
                  >
                    <el-option
                      v-for="t in templates"
                      :key="t.id"
                      :label="t.name"
                      :value="t.id"
                    />
                  </el-select>
                  <div v-if="isEdit && form.status !== 'completed'" class="template-tip">
                    <el-icon><InfoFilled /></el-icon>
                    <span>编辑模式下可以更换模板，但会覆盖现有检查项目</span>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <el-divider content-position="left">巡检项目</el-divider>
          </div>
        </el-form>

        <div class="main-content">
          <!-- 左侧设备列表 -->
          <div class="device-list">
            <div class="device-header">
              <h3>设备列表</h3>
              <span class="device-count">{{ getDeviceList().length }} 台设备</span>
            </div>
            <el-scrollbar class="device-scrollbar">
                <div 
                  v-for="(device, deviceIndex) in getDeviceList()" 
                  :key="`device-${deviceIndex}`"
                  :class="['device-item', { 'active': activeDeviceIndex === deviceIndex }]"
                  @click="selectDevice(deviceIndex)"
                >
                  <div class="device-code">{{ device.code }}</div>
                  <div class="device-name">{{ device.name }}</div>
                </div>
              </el-scrollbar>
          </div>

          <!-- 右侧检查项网格布局 -->
          <div class="inspection-grid">
            <div class="grid-header">
              <h3>{{ activeDeviceIndex !== null ? getDeviceList()[activeDeviceIndex]?.name + ' - 巡检项目' : '请选择设备查看巡检项目' }}</h3>
              <span class="item-count">{{ activeDeviceIndex !== null ? getFilteredInspectionItems().length + ' 项检查' : '' }}</span>
            </div>
            <el-scrollbar class="grid-scrollbar">
              <div class="grid-container">
                <div 
                  v-for="(item, index) in getFilteredInspectionItems()" 
                  :key="`inspection-${item.originalIndex}`" 
                  :class="['inspection-item-grid', { 
                    'is-group': item.isGroup,
                    'is-focused': activeFocusItem === item.originalIndex && !item.isGroup
                  }]"
                  @click="!item.isGroup && (activeFocusItem = item.originalIndex)"
                >
                  <div class="item-header">
                    <span class="item-index">{{ item.code }}</span>
                    <el-input
                      v-model="item.name"
                      placeholder="检查项名称"
                      :disabled="!item.isCustom"
                      style="flex: 1"
                    />
                    <el-tag v-if="item?.isCustom" type="info" size="small">自定义</el-tag>
                    <el-button
                      v-if="!isCompleted"
                      type="danger"
                      :icon="Delete"
                      circle
                      size="small"
                      @click.stop="removeItem(item.originalIndex)"
                    />
                  </div>
                  <div class="item-content">
                    <el-input
                      v-model="item.result"
                      type="textarea"
                      :rows="3"
                      placeholder="填写检查结果..."
                      :disabled="isCompleted"
                      @focus="activeFocusItem = item.originalIndex"
                    />
                    <div class="item-image">
                      <!-- 必更标识：仅在复制巡检时，且该项为必更项且未被更新时显示 -->
                      <div v-if="shouldShowDynamicMarker && item?.isDynamic && !item?.isUpdated" class="dynamic-marker">
                        <el-icon class="is-loading"><Refresh /></el-icon>
                        <span>必更项</span>
                      </div>

                      <!-- 未上传图片标识：非分组项、未完成且图片为空时显示 -->
                      <div v-if="!isCompleted && (!item?.imagePaths || item?.imagePaths?.length === 0)" class="dynamic-marker missing-image">
                        <el-icon><Warning /></el-icon>
                        <span>请上传图片</span>
                      </div>

                      <!-- 多图展示区：网格布局 -->
                      <div class="image-gallery">
                        <!-- 已上传的图片缩略图 -->
                        <div 
                          v-for="(imgPath, imgIndex) in item?.imagePaths || []" 
                          :key="imgIndex" 
                          class="image-thumb"
                          @click="handlePreviewImage(imgPath)"
                        >
                          <img :src="getImageUrl(imgPath)" alt="截图" />
                          <div v-if="!isCompleted" class="thumb-actions">
                            <el-button 
                              size="small" 
                              type="danger" 
                              :icon="Delete" 
                              circle
                              @click.stop="() => { item.imagePaths.splice(imgIndex, 1); item.isUpdated = true; activeFocusItem = item.originalIndex; }"
                            />
                          </div>
                        </div>

                        <!-- 空白上传区：未完成时始终显示，点击上传或粘贴 -->
                        <div 
                          v-if="!isCompleted"
                          :class="['upload-slot', { 
                            'is-dynamic': shouldShowDynamicMarker && item?.isDynamic && !item?.isUpdated 
                          }]" 
                          @click="activeFocusItem = item.originalIndex"
                        >
                          <el-icon :size="20"><Upload /></el-icon>
                          <span>点击或粘贴</span>
                          <el-upload
                            :show-file-list="false"
                            :before-upload="(file) => handleUpload(file, item.originalIndex)"
                            accept="image/*"
                          >
                            <el-button size="small" type="primary" plain style="margin-top: 4px">
                              选择文件
                            </el-button>
                          </el-upload>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 提示信息：当没有选中设备时 -->
                <div v-if="activeDeviceIndex === null" class="empty-tips">
                  <p>请从左侧设备列表中选择设备查看巡检项目</p>
                </div>
                
                <!-- 提示信息：当选中设备但没有检查项时 -->
                <div v-else-if="getFilteredInspectionItems().length === 0" class="empty-tips">
                  <p>暂无检查项</p>
                  <el-button v-if="!isCompleted" type="primary" plain @click="addCustomItem" class="add-btn">
                    <el-icon><Plus /></el-icon>
                    添加自定义检查项
                  </el-button>
                </div>
                
                <!-- 当有检查项时，底部也显示添加按钮 -->
                <div v-else-if="!isCompleted" class="add-item-section">
                  <el-button type="primary" plain @click="addCustomItem" class="add-btn-bottom">
                    <el-icon><Plus /></el-icon>
                    添加自定义检查项
                  </el-button>
                </div>
              </div>
            </el-scrollbar>
          </div>
        </div>

        <div class="inspection-footer">
          <el-divider />
          <el-form-item v-if="!isCompleted">
            <el-button type="primary" @click="handleSave('draft')" :loading="saving">
              保存草稿
            </el-button>
            <el-button type="success" @click="handleSave('completed')" :loading="saving">
              完成并保存
            </el-button>
          </el-form-item>
        </div>
      </div>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog 
      v-model="previewVisible" 
      title="图片预览" 
      width="90%" 
      top="5vh"
      :append-to-body="true"
      :close-on-click-modal="true"
    >
      <div class="preview-container">
        <img :src="previewImageUrl" alt="预览图片" class="preview-image" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Plus, Delete, Upload, Refresh, Warning, InfoFilled } from '@element-plus/icons-vue'
import { getUsers } from '../api/auth'
import { getTemplates } from '../api/template'
import { getInspection, createInspection, updateInspection } from '../api/inspection'
import { uploadImage } from '../api/upload'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()

const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const templates = ref([])
const users = ref([])
const uploadRefs = ref([])
const activeUploadIndex = ref(null)
const activeFocusItem = ref(null) // 记录当前聚焦的检查项索引
const previewImageUrl = ref('') // 预览图片URL
const previewVisible = ref(false) // 预览对话框显示状态
const isFromCopy = ref(false) // 是否锁定为复制模式
const activeDeviceIndex = ref(null) // 记录当前选中的设备索引

const isEdit = computed(() => !!route.params.id)

const isCompleted = computed(() => form.status === 'completed')

// 【核心逻辑】只要是复制模式，且未完成时，全局激活标识显示
const shouldShowDynamicMarker = computed(() => {
  if (isCompleted.value) return false
  return true
})

const form = reactive({
  title: '',
  templateId: null,
  inspectionTime: new Date(), // 直接使用 Date 对象，保持本地时区
  inspectorId: null,
  status: 'draft',
  items: []
})



const rules = {
  title: [{ required: true, message: '请输入巡检标题', trigger: 'blur' }],
  inspectorId: [{ required: true, message: '请选择巡检人', trigger: 'change' }]
}

const getImageUrl = (path) => {
  if (!path) return ''
  // 上传目录已加鉴权，<img> 无法携带请求头，通过 query 传递 token
  const token = localStorage.getItem('token')
  return `/api/${path}?token=${encodeURIComponent(token || '')}`
}

// 预览图片
const handlePreviewImage = (imgPath) => {
  previewImageUrl.value = getImageUrl(imgPath)
  previewVisible.value = true
}

const setUploadRef = (el, index) => {
  if (el) {
    uploadRefs.value[index] = el
  }
}

const handlePaste = async (e, index) => {
  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        // 转换为高质量 JPEG (1080p)
        const highQualityFile = await convertToHighQualityImage(file)
        await handleUpload(highQualityFile, index !== undefined ? index : activeUploadIndex.value)
      }
      break
    }
  }
}

// 将粘贴的图片转换为高质量 JPEG
const convertToHighQualityImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // 保持原始尺寸，不做任何缩放
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          const newFile = new File([blob], `screenshot-${Date.now()}.jpg`, { type: 'image/jpeg' })
          resolve(newFile)
        }, 'image/jpeg', 0.98) // 98% 质量，接近无损
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const handleGlobalPaste = (e) => {
  const target = e.target
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return
  }
  
  // 优先粘贴到当前聚焦的检查项，否则找第一个没有图片的项
  let targetIndex = activeFocusItem.value
  if (targetIndex === null || form.items[targetIndex]?.isGroup) {
    targetIndex = form.items.findIndex(item => item && !item.isGroup && (!item.imagePaths || item.imagePaths?.length === 0))
  }
  
  if (targetIndex !== -1) {
    handlePaste(e, targetIndex)
  }
}

const handleTemplateChange = async (templateId) => {
  if (!templateId) {
    // 如果是编辑模式且清空模板，保留现有项目
    if (!isEdit.value) {
      form.items = []
    }
    return
  }

  const template = templates.value.find(t => t.id === templateId)
  if (template?.items) {
    // 在编辑模式下，提醒用户更换模板会覆盖现有项目
    if (isEdit.value && form.items.length > 0) {
      try {
        await ElMessageBox.confirm(
          '更换模板将覆盖现有的所有检查项目，是否继续？',
          '确认更换模板',
          {
            confirmButtonText: '继续',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
      } catch {
        // 用户取消，恢复原模板选择
        form.templateId = form.templateId
        return
      }
    }
    
    form.items = template.items.map(item => ({
      name: item.name,
      result: isEdit.value ? '' : '', // 编辑时也清空结果
      imagePaths: [], // 多图数组，始终清空
      isCustom: false,
      isGroup: item.isGroup || false,
      isDynamic: !!item.isDynamic,
      isUpdated: true, // 新建巡检不显示必更标识
      level: item.level, // 保持模板原有的level值
      code: item.code || ''
    }))
    
    ElMessage.success(isEdit.value ? '模板已更换，检查项目已重置' : '模板已应用')
  }
}

const addCustomItem = () => {
  form.items.push({
    name: '',
    result: '',
    imagePaths: [], // 多图数组
    isCustom: true,
    level: 2,
    isGroup: false
  })
}

const removeItem = (index) => {
  form.items.splice(index, 1)
}

// 核心算法：根据扁平数组的顺序和 Level 自动计算编号 (1.1, 1.1.1, 2.1)
const calculateItemCode = (index) => {
  const items = form.items
  const counts = [0, 0, 0, 0, 0] // 记录各层级的序号
  
  for (let i = 0; i <= index; i++) {
    const level = items[i].level || 1
    counts[level]++
    for (let j = level + 1; j < counts.length; j++) {
      counts[j] = 0
    }
  }
  
  const level = items[index].level || 1
  if (level === 1) return `${counts[1]}.1`
  if (level === 2) return `${counts[1]}.1.${counts[2]}`
  if (level === 3) return `${counts[1]}.1.${counts[2]}.${counts[3]}`
  return String(index + 1)
}

// 选择设备
const selectDevice = (deviceIndex) => {
  // 如果点击的是同一个设备，则取消选择
  if (activeDeviceIndex.value === deviceIndex) {
    activeDeviceIndex.value = null
  } else {
    activeDeviceIndex.value = deviceIndex
    // 找到对应设备的第一个检查项并聚焦
    const deviceList = getDeviceList()
    const selectedDevice = deviceList[deviceIndex]
    if (selectedDevice) {
      // 查找该设备下的第一个Level 2的检查项
      const firstInspectionItem = form.items.findIndex((item, idx) => 
        idx > selectedDevice.originalIndex && 
        item.level >= 2 && 
        !item.isGroup &&
        // 确保是同一个设备下的（通过编号前缀匹配）
        calculateItemCode(idx).startsWith(selectedDevice.code.split('.')[0] + '.')
      )
      if (firstInspectionItem !== -1) {
        activeFocusItem.value = firstInspectionItem
      }
    }
  }
}

// 重置选中设备
const resetSelection = () => {
  activeDeviceIndex.value = null
}

// 获取设备列表（左侧显示用）
const getDeviceList = () => {
  return form.items
    .map((item, index) => ({
      ...item,
      originalIndex: index,
      code: calculateItemCode(index)
    }))
    .filter(item => item && item.level === 1)
}

// 获取过滤后的检查项（右侧显示用）
const getFilteredInspectionItems = () => {
  // 如果没有选中设备，不显示任何检查项
  if (activeDeviceIndex.value === null) {
    return []
  }
  
  // 只显示Level 2及以上的检查项，并保留原始索引
  const inspectionItems = form.items
    .map((item, index) => ({
      ...item,
      originalIndex: index,
      code: calculateItemCode(index)
    }))
    .filter(item => item && item.level >= 2 && !item.isGroup)
  
  // 获取选中的设备
  const deviceList = getDeviceList()
  const selectedDevice = deviceList[activeDeviceIndex.value]
  if (!selectedDevice) {
    return []
  }
  
  // 通过编号前缀匹配来过滤属于该设备的检查项
  const devicePrefix = selectedDevice.code.split('.')[0] + '.'
  return inspectionItems.filter(item => 
    item.code.startsWith(devicePrefix)
  )
}

const handleUpload = async (file, itemIndex) => {
  try {
    const res = await uploadImage(file)
    const item = form.items[itemIndex]
    if (!item) return
      
    // 初始化 imagePaths 为数组（防止老数据兼容问题）
    if (!Array.isArray(item.imagePaths)) {
      item.imagePaths = []
    }
    item.imagePaths.push(res.path)
    item.isUpdated = true // 标记为已更新，消除必更标识
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
  return false
}

const fetchTemplates = async () => {
  try {
    templates.value = await getTemplates()
  } catch {}
}

const fetchInspection = async () => {
  if (!isEdit.value) {
    // 新建巡检时，默认巡检人为当前用户
    const userStore = useUserStore()
    form.inspectorId = userStore.user?.id
    // 初始化一个空白检查项
    form.items = []
    return
  }
  
  // 【第一步】加载前锁定模式，应对手动 URL 输入的情况
  if (route.query.mode === 'copy') {
    isFromCopy.value = true
  }

  loading.value = true
  try {
    const data = await getInspection(route.params.id)
    form.title = data.title
    form.templateId = data.templateId
    form.inspectorId = data.inspectorId
    form.status = data.status || 'draft'
    
    // 【关键修复】将 API 返回的 ISO 字符串转换为本地 Date 对象
    form.inspectionTime = data.inspectionTime ? new Date(data.inspectionTime) : null

    // 【关键动作】如果是复制模式，获取模板以同步最新的必更状态
    let templateData = null
    if (isFromCopy.value && data.templateId) {
      try {
        templateData = templates.value.find(t => t.id === data.templateId)
        // 如果 templates 还没加载完，尝试加载单个模板
        if (!templateData) {
          const allTemplates = await getTemplates()
          templateData = allTemplates.find(t => t.id === data.templateId)
        }
      } catch (err) {
        console.error('Fetch template for sync failed:', err)
      }
    }

    form.items = data.items?.map(item => {
      // 临时调试：打印每个项目的详细信息
      console.log('Processing item:', {
        name: item.name,
        level: item.level,
        isGroup: item.isGroup,
        originalLevel: item.level
      });
      // 解析 imagePath
      let imagePaths = []
      if (item.imagePath) {
        try {
          const parsed = JSON.parse(item.imagePath)
          imagePaths = Array.isArray(parsed) ? parsed : [item.imagePath]
        } catch {
          imagePaths = [item.imagePath]
        }
      }
      
      // 【第二步】模式判定逻辑
      const currentModeIsCopy = isFromCopy.value || route.query.mode === 'copy'
      
      // 尝试从模板中匹配最新的 isDynamic 状态
      let isDynamic = !!item.isDynamic
      if (currentModeIsCopy && templateData?.items) {
        const matched = templateData.items.find(ti => ti.name === item.name && ti.level === item.level)
        if (matched) {
          isDynamic = !!matched.isDynamic
        }
      }

      return {
        name: item.name,
        result: item.result || '',
        imagePaths: imagePaths,
        isCustom: item.isCustom || false,
        isGroup: item.isGroup || false,
        isDynamic: isDynamic,
        // 【终极修复】优先使用数据库传回的状态，如果没有则根据模式判定
        isUpdated: item.isUpdated !== undefined ? !!item.isUpdated : !currentModeIsCopy,
        level: item.level,
        code: item.code || ''
      }
    }) || []

    // 移除不稳定的旧逻辑
  } finally {
    loading.value = false
  }
}

const handleSave = async (status) => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const validItems = form.items.filter(i => i.name.trim())
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一个检查项')
    return
  }

  // 【关键逻辑】检查是否存在未完成的项（必更或缺图）
  let finalStatus = status
  if (status === 'completed') {
    const hasIncomplete = form.items.some(item => 
      (shouldShowDynamicMarker.value && item.isDynamic && !item.isUpdated) ||
      (!item.isGroup && (!item.imagePaths || item.imagePaths.length === 0))
    )

    if (hasIncomplete) {
      finalStatus = 'draft'
      ElMessage.warning('检测到仍有“必更”或“未传图”的检查项，巡检记录将自动降级保存为【草稿】')
    }
  }

  // 保存前统一计算并更新所有项的编号，并规范化 imagePaths
  const itemsToSave = validItems.map((item, index) => ({
    ...item,
    code: calculateItemCode(index),
    // 前端发送数组，后端会转换为 JSON 字符串
    imagePath: item.imagePaths || []
  }))

  saving.value = true
  try {
    const data = {
      title: form.title,
      templateId: form.templateId,
      inspectionTime: form.inspectionTime,
      inspectorId: form.inspectorId,
      status: finalStatus,
      items: itemsToSave
    }

    if (isEdit.value) {
      await updateInspection(route.params.id, data)
      ElMessage.success('保存成功')
    } else {
      await createInspection(data)
      ElMessage.success('创建成功')
    }
    router.push('/inspections')
  } finally {
    saving.value = false
  }
}

const fetchUsers = async () => {
  try {
    users.value = await getUsers()
  } catch {}
}

onMounted(() => {
  fetchTemplates()
  fetchUsers()
  fetchInspection()
  
  // 如果是新建巡检，初始化为当前本地时间
  if (!isEdit.value) {
    form.inspectionTime = new Date()
    // 确保在新建模式下显示添加按钮
    setTimeout(() => {
      // 确保DOM更新完成
    }, 100);
  }
  
  // 添加全局粘贴监听
  document.addEventListener('paste', handleGlobalPaste)
})

onUnmounted(() => {
  // 移除全局粘贴监听
  document.removeEventListener('paste', handleGlobalPaste)
})
</script>

<style scoped>
.inspection-edit {
  max-width: 100%;
  margin: 0 auto;
  height: 100%; /* 撑满父容器 */
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

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 20px;
  margin-top: 10px;
}

.device-list {
  width: 280px;
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
}

.device-header h3 {
  margin: 0 0 5px 0;
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
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
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
}

.device-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.item-count {
  font-size: 12px;
  color: #666;
}

.grid-scrollbar {
  height: calc(100% - 60px);
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 10px;
  min-height: 300px;
}

.inspection-item-grid {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.inspection-item-grid:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 聚焦高亮效果 */
.inspection-item-grid.is-focused {
  border-color: #667eea !important;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
  background: #f5f7ff;
}



.inspection-form {
  display: flex;
  flex-direction: column;
  height: auto;
  overflow: visible;
}

.inspection-form-header {
  flex-shrink: 0;
  padding-bottom: 10px;
}

.template-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  font-size: 12px;
  color: #0369a1;
}

.inspection-footer {
  flex-shrink: 0;
  background: #fff;
  z-index: 10;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.item-index {
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.item-content {
  display: flex;
  flex-direction: column; /* 改为上下结构 */
  gap: 12px;
}

.item-content > .el-input {
  width: 100%; /* 文本框全宽 */
}

.item-image {
  width: 100%;
  position: relative;
}

/* 多图画廊：网格布局 */
.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

/* 已上传图片缩略图 */
.image-thumb {
  width: 120px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
  flex-shrink: 0;
  cursor: pointer;
}

.image-thumb::after {
  content: '点击查看';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;
  padding: 4px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-thumb:hover::after {
  opacity: 1;
}

.image-thumb:hover {
  border-color: #667eea;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-thumb:hover .thumb-actions {
  opacity: 1;
}

/* 空白上传区 */
.upload-slot {
  width: 120px;
  height: 90px;
  border: 2px dashed #ddd;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #999;
  transition: all 0.3s ease;
  background: #fafafa;
  flex-shrink: 0;
  cursor: pointer;
}

.upload-slot:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f5f7ff;
}

.upload-slot span {
  font-size: 12px;
}

/* 必更项边框 */
.upload-slot.is-dynamic {
  border-color: #ff7675 !important;
  background: #fff5f5 !important;
}

/* 重新设计的动态标识 */
.dynamic-marker {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
  color: #d63031;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(214, 48, 49, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  animation: marker-pulse 2s infinite;
}

/* 请上传图片（橙色）*/
.dynamic-marker.missing-image {
  background: linear-gradient(135deg, #ff9966 0%, #ff5e62 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 94, 98, 0.3);
}

@keyframes marker-pulse {
  0% { transform: scale(1); box-shadow: 0 2px 8px rgba(214, 48, 49, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 4px 12px rgba(214, 48, 49, 0.5); }
  100% { transform: scale(1); box-shadow: 0 2px 8px rgba(214, 48, 49, 0.3); }
}

.add-btn {
  width: 100%;
  margin-top: 8px;
}

.empty-tips {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.empty-tips p {
  margin: 0;
}

.add-btn {
  margin-top: 0;
}

.add-item-section {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px 0;
}

.add-btn-bottom {
  width: auto;
}

/* 图片预览样式 */
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background: #fff;
  padding: 20px;
  overflow: auto;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
