pipeline {
    agent any
    
    environment {
        BACKEND_IMAGE = "yassird/expense-manager-backend"
        FRONTEND_IMAGE = "yassird/expense-manager-frontend"
        BUILD_TAG = "${BUILD_ID}" // Use the Jenkins build ID as the tag
        K8S_REPO_PATH = "${WORKSPACE}/expense-manager-k8s" // Cloned Kubernetes manifests repo
        K8S_MANIFEST_REPO = "https://github.com/YasGuy/expense-manager-k8s.git"
        GIT_CREDENTIALS_ID = "github-pat" // Jenkins credentials ID for GitHub PAT (token)
    }
    
    stages {
        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh 'docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD'
                }
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Run Semgrep Analysis') {
            steps {
                sh '''
                    docker run --rm -v "${WORKSPACE}:/src" returntocorp/semgrep semgrep scan --config auto /src/backend
                    docker run --rm -v "${WORKSPACE}:/src" returntocorp/semgrep semgrep scan --config auto /src/frontend
                '''
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                dir('backend') {
                    sh 'docker build -t ${BACKEND_IMAGE}:${BUILD_TAG} .'
                }
            }
        }
        
        stage('Build Frontend Docker Image') {
            steps {
                dir('frontend') {
                    sh 'docker build -t ${FRONTEND_IMAGE}:${BUILD_TAG} .'
                }
            }
        }
        
        stage('Push Docker Images') {
            steps {
                sh 'docker push ${BACKEND_IMAGE}:${BUILD_TAG}'
                sh 'docker push ${FRONTEND_IMAGE}:${BUILD_TAG}'
            }
        }
        
        stage('Clone Kubernetes Manifests Repo') {
            steps {
                dir("${K8S_REPO_PATH}") {
                    git url: "${K8S_MANIFEST_REPO}", branch: 'main', credentialsId: "${GIT_CREDENTIALS_ID}"
                }
            }
        }
        
        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    // Read backend deployment YAML file
                    def backendDeployment = readFile("${K8S_REPO_PATH}/dev/backend-deployment.yaml")
                    def frontendDeployment = readFile("${K8S_REPO_PATH}/dev/frontend-deployment.yaml")
                    
                    // Update image tag for backend and frontend deployments
                    backendDeployment = backendDeployment.replaceAll(/image: ${BACKEND_IMAGE}:\S+/, "image: ${BACKEND_IMAGE}:${BUILD_TAG}")
                    frontendDeployment = frontendDeployment.replaceAll(/image: ${FRONTEND_IMAGE}:\S+/, "image: ${FRONTEND_IMAGE}:${BUILD_TAG}")
                    
                    // Write updated YAML files back
                    writeFile file: "${K8S_REPO_PATH}/dev/backend-deployment.yaml", text: backendDeployment
                    writeFile file: "${K8S_REPO_PATH}/dev/frontend-deployment.yaml", text: frontendDeployment
                }
            }
        }
        
        stage('Push Updated Manifests to Git Repo') {
            steps {
                dir("${K8S_REPO_PATH}") {
                    withCredentials([string(credentialsId: "${GIT_CREDENTIALS_ID}", variable: 'GITHUB_TOKEN')]) {
                        sh '''
                            git config --global user.name "YasGuy"
                            git config --global user.email "yassirdiri@gmail.com"
                            git add .
                            git commit -m "Update deployment manifests with new image tags: ${BUILD_TAG}"
                            git push https://$GITHUB_TOKEN@github.com/YasGuy/expense-manager-k8s.git main
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker rmi ${BACKEND_IMAGE}:${BUILD_TAG} || true'
            sh 'docker rmi ${FRONTEND_IMAGE}:${BUILD_TAG} || true'
        }
        success {
            echo 'Build and deployment completed successfully!'
        }
        failure {
            echo 'Build or deployment failed. Please check the logs.'
        }
    }
}
