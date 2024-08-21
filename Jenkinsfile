pipeline {
    agent any

    environment {
        BACKEND_IMAGE = "yassird/expense-manager-backend"
        FRONTEND_IMAGE = "yassird/expense-manager-frontend"
        BUILD_TAG = "${BUILD_ID}" // Use the Jenkins build ID as the tag
        K8S_REPO_PATH = "/home/yassir/Desktop/expense-manager-k8s" // Path to your already cloned repo
        K8S_MANIFEST_REPO = "https://github.com/YasGuy/expense-manager-k8s.git"
        GITHUB_USERNAME = 'YasGuy'
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

        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    // Update backend and frontend deployment manifests
                    def backendManifest = readFile("${K8S_REPO_PATH}/backend-deployment.yaml")
                    def frontendManifest = readFile("${K8S_REPO_PATH}/frontend-deployment.yaml")

                    // Replace image tags in the manifests
                    backendManifest = backendManifest.replaceAll(/(image: ${BACKEND_IMAGE}:)\S+/, "\$1${BUILD_TAG}")
                    frontendManifest = frontendManifest.replaceAll(/(image: ${FRONTEND_IMAGE}:)\S+/, "\$1${BUILD_TAG}")

                    // Write the updated manifests back to the files
                    writeFile file: "${K8S_REPO_PATH}/backend-deployment.yaml", text: backendManifest
                    writeFile file: "${K8S_REPO_PATH}/frontend-deployment.yaml", text: frontendManifest
                }
            }
        }

        stage('Push Updated Manifests to Git Repo') {
            steps {
                withCredentials([string(credentialsId: 'github-pat', variable: 'GITHUB_TOKEN')]) {
                    dir("${K8S_REPO_PATH}") {
                        sh '''
                            git add .
                            git commit -m "Update Kubernetes manifests with new image tags: ${BUILD_TAG}"
                            git push https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/YasGuy/expense-manager-k8s.git main
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
