# travel-pc 镜像（本地构建 + COPY 方式）
#
# 构建步骤（在本目录 D:\go_work\simple-admin\travel\travel-pc 执行）：
#   npm run build                                # vite build 自动加载 .env + .env.production，产出 dist/
#   docker build -t registry.cn-hangzhou.aliyuncs.com/zifeng6257/travel-pc:v1 .
#   docker push registry.cn-hangzhou.aliyuncs.com/zifeng6257/travel-pc:v1
#
# 对应 k8s 清单：deploy/kubernetes/frontend/travel-pc.yaml

FROM nginx:1.29-alpine

# 本地 vite build 产物
COPY dist/ /usr/share/nginx/html/
# 生产 nginx 配置（含集群内 API 反向代理规则）
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
