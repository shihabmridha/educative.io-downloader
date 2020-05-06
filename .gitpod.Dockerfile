FROM gitpod/workspace-full-vnc:latest

USER gitpod

# install dependencies
RUN npm install -g typescript
