CREATE TABLE vessel_drawings (
    id BIGSERIAL PRIMARY KEY COMMENT '主键ID',
    material_code VARCHAR(64) NOT NULL COMMENT '物料编码',
    version VARCHAR(16) NOT NULL DEFAULT 'V1.0' COMMENT '版本号（如V1.0/V1.1）',
    file_path VARCHAR(512) NOT NULL COMMENT '文件存储路径',
    file_name VARCHAR(256) NOT NULL COMMENT '文件名',
    created_by VARCHAR(64) NOT NULL COMMENT '创建人',
    updated_by VARCHAR(64) NOT NULL COMMENT '修改人',
    remark TEXT COMMENT '备注',
    working_pressure NUMERIC(10,3) NOT NULL COMMENT '工作压力(MPa)',
    design_pressure NUMERIC(10,3) NOT NULL COMMENT '设计压力(MPa)',
    design_temperature NUMERIC(6,1) NOT NULL COMMENT '设计温度(℃)',
    volume NUMERIC(12,4) NOT NULL COMMENT '容积(m³)',
    structure_type VARCHAR(16) NOT NULL COMMENT '结构形式(立式/卧式)',
    material VARCHAR(64) NOT NULL COMMENT '材质',
    design_life INT NOT NULL DEFAULT 20 COMMENT '设计使用年限(年)',
    medium VARCHAR(128) NOT NULL COMMENT '介质',
    nominal_diameter NUMERIC(8,1) NOT NULL COMMENT '公称直径(mm)',
    wall_thickness NUMERIC(6,2) NOT NULL COMMENT '壁厚(mm)',
    total_height_or_length NUMERIC(10,1) NOT NULL COMMENT '设备总高/总长(mm)',
    weight NUMERIC(12,2) NOT NULL COMMENT '重量(kg)',
    safety_valve_connection VARCHAR(64) COMMENT '安全阀接口及连接形式',
    drain_connection VARCHAR(64) COMMENT '排污口连接形式及大小',
    inlet_connection VARCHAR(64) COMMENT '进口连接形式及大小',
    outlet_connection VARCHAR(64) COMMENT '出口连接形式及大小',
    inlet_count INT NOT NULL DEFAULT 1 COMMENT '进口数量(几进)',
    outlet_count INT NOT NULL DEFAULT 1 COMMENT '出口数量(几出)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除(0-否,1-是)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='压力容器方案简图';

CREATE INDEX idx_vessel_drawings_material_code ON vessel_drawings(material_code);
CREATE INDEX idx_vessel_drawings_volume ON vessel_drawings(volume);
CREATE INDEX idx_vessel_drawings_design_pressure ON vessel_drawings(design_pressure);
CREATE INDEX idx_vessel_drawings_nominal_diameter ON vessel_drawings(nominal_diameter);
CREATE INDEX idx_vessel_drawings_structure_type ON vessel_drawings(structure_type);
CREATE INDEX idx_vessel_drawings_created_at ON vessel_drawings(created_at);
CREATE INDEX idx_vessel_drawings_is_deleted ON vessel_drawings(is_deleted);
CREATE INDEX idx_vessel_drawings_material ON vessel_drawings(material);
CREATE INDEX idx_vessel_drawings_medium ON vessel_drawings(medium);
CREATE INDEX idx_vessel_drawings_combined_search ON vessel_drawings(structure_type, volume, design_pressure, nominal_diameter);
