# 压力容器方案简图管理系统 API 设计

## 1. 多条件范围检索 API

### GET /api/v1/drawings/search

**请求参数 (Query Parameters):**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| material_code | string | 否 | 物料编码（模糊匹配） |
| structure_type | string | 否 | 结构形式（立式/卧式） |
| volume_min | number | 否 | 容积最小值 (m³) |
| volume_max | number | 否 | 容积最大值 (m³) |
| design_pressure_min | number | 否 | 设计压力最小值 (MPa) |
| design_pressure_max | number | 否 | 设计压力最大值 (MPa) |
| nominal_diameter_min | number | 否 | 公称直径最小值 (mm) |
| nominal_diameter_max | number | 否 | 公称直径最大值 (mm) |
| material | string | 否 | 材质 |
| medium | string | 否 | 介质（模糊匹配） |
| design_temperature_min | number | 否 | 设计温度最小值 (℃) |
| design_temperature_max | number | 否 | 设计温度最大值 (℃) |
| design_life_min | number | 否 | 设计使用年限最小值 (年) |
| design_life_max | number | 否 | 设计使用年限最大值 (年) |
| wall_thickness_min | number | 否 | 壁厚最小值 (mm) |
| wall_thickness_max | number | 否 | 壁厚最大值 (mm) |
| weight_min | number | 否 | 重量最小值 (kg) |
| weight_max | number | 否 | 重量最大值 (kg) |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |
| sort_by | string | 否 | 排序字段 |
| sort_order | string | 否 | 排序方向 (asc/desc) |

**请求示例:**
```
GET /api/v1/drawings/search?structure_type=立式&volume_min=1&volume_max=10&design_pressure_min=0.5&design_pressure_max=2.5&nominal_diameter_min=500&nominal_diameter_max=2000&page=1&page_size=20
```

**成功返回:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 128,
    "list": [
      {
        "id": 1,
        "material_code": "VES-2024-001",
        "version": "V1.0",
        "file_path": "/uploads/drawings/VES-2024-001.pdf",
        "file_name": "储气罐方案简图.pdf",
        "created_by": "张三",
        "updated_by": "李四",
        "remark": "客户定制方案",
        "working_pressure": 1.0,
        "design_pressure": 1.25,
        "design_temperature": 80,
        "volume": 5.0,
        "structure_type": "立式",
        "material": "Q235B",
        "design_life": 20,
        "medium": "压缩空气",
        "nominal_diameter": 1000,
        "wall_thickness": 8.0,
        "total_height_or_length": 6500,
        "weight": 2800,
        "safety_valve_connection": "DN50 PN16 RF",
        "drain_connection": "DN25 PN16",
        "inlet_connection": "DN100 PN16 RF",
        "outlet_connection": "DN100 PN16 RF",
        "inlet_count": 1,
        "outlet_count": 1,
        "created_at": "2024-01-15T10:30:00",
        "updated_at": "2024-01-20T14:45:00"
      }
    ],
    "page": 1,
    "page_size": 20
  }
}
```

## 2. 图纸新增 API

### POST /api/v1/drawings

**请求 Body:**
```json
{
  "material_code": "VES-2024-002",
  "version": "V1.0",
  "file_path": "/uploads/drawings/VES-2024-002.pdf",
  "file_name": "反应釜方案简图.pdf",
  "created_by": "张三",
  "updated_by": "张三",
  "remark": "标准型号",
  "working_pressure": 0.8,
  "design_pressure": 1.0,
  "design_temperature": 150,
  "volume": 3.0,
  "structure_type": "立式",
  "material": "304不锈钢",
  "design_life": 15,
  "medium": "化工原料",
  "nominal_diameter": 800,
  "wall_thickness": 10.0,
  "total_height_or_length": 5200,
  "weight": 3200,
  "safety_valve_connection": "DN40 PN10 RF",
  "drain_connection": "DN20 PN10",
  "inlet_connection": "DN80 PN10 RF",
  "outlet_connection": "DN80 PN10 RF",
  "inlet_count": 1,
  "outlet_count": 2
}
```

**成功返回:**
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 2
  }
}
```

## 3. 图纸修改 API

### PUT /api/v1/drawings/{id}

**请求 Body:** 同新增 API

**成功返回:**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": null
}
```

## 4. 图纸删除 API

### DELETE /api/v1/drawings/{id}

**成功返回:**
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

## 5. 图纸详情 API

### GET /api/v1/drawings/{id}

**成功返回:**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "material_code": "VES-2024-001",
    "version": "V1.0",
    "file_path": "/uploads/drawings/VES-2024-001.pdf",
    "file_name": "储气罐方案简图.pdf",
    "created_by": "张三",
    "updated_by": "李四",
    "remark": "客户定制方案",
    "working_pressure": 1.0,
    "design_pressure": 1.25,
    "design_temperature": 80,
    "volume": 5.0,
    "structure_type": "立式",
    "material": "Q235B",
    "design_life": 20,
    "medium": "压缩空气",
    "nominal_diameter": 1000,
    "wall_thickness": 8.0,
    "total_height_or_length": 6500,
    "weight": 2800,
    "safety_valve_connection": "DN50 PN16 RF",
    "drain_connection": "DN25 PN16",
    "inlet_connection": "DN100 PN16 RF",
    "outlet_connection": "DN100 PN16 RF",
    "inlet_count": 1,
    "outlet_count": 1,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-20T14:45:00"
  }
}
```
