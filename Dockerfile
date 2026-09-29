# travel-pc 镜像（本地构建 + COPY 方式）
#
# 构建步骤（在本目录 D:\go_work\simple-admin\travel\travel-pc 执行）：
#   npm run build                                # vite build 自动加载 .env + .env.production，产出 dist/
#   docker build -t registry.cn-hangzhou.aliyuncs.com/zifeng6257/travel-pc:v1 .
#   docker push registry.cn-hangzhou.aliyuncs.com/zifeng6257/travel-pc:v1
#
# 对应 k8s 清单：deploy/kubernetes/frontend/travel-pc.yaml

# 基座：docker.io 官方 nginx 因 aliyun 加速器 403 拉不动；借本机已含标准 nginx 的 fms-api:v4
FROM registry.cn-hangzhou.aliyuncs.com/zifeng6257/fms-api:v4

# 本地 vite build 产物
COPY dist/ /usr/share/nginx/html/
# 生产 nginx 配置（含集群内 API 反向代理规则）
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 覆盖 fms 自带入口，仅前台运行 nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]
