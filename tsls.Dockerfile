FROM node:22-alpine
ARG project_path
RUN corepack enable
RUN corepack prepare yarn@stable --activate
WORKDIR ${project_path:?}
COPY . .

# Necessary due to packages that must themselves be built, like esbuild
RUN yarn install

CMD ["yarn", "run", "typescript-language-server", "--stdio"]
