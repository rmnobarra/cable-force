#!/bin/bash
set -e

# Cable Force - Kind + Gateway API Setup Script
CLUSTER_NAME="cable-force-cluster"

echo "☸️ Creating Kind cluster..."
cat <<EOF | kind create cluster --name ${CLUSTER_NAME} --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30788
    hostPort: 80
    listenAddress: "127.0.0.1"
    protocol: TCP
EOF

echo "🚀 Installing Gateway API Experimental CRDs (v1.4.1)..."
kubectl apply --server-side --force-conflicts -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.1/experimental-install.yaml

echo "🛠 Installing Envoy Gateway via Helm..."
helm install eg oci://docker.io/envoyproxy/gateway-helm --version v1.1.0 -n envoy-gateway-system --create-namespace

echo "⏳ Waiting for Envoy Gateway to be ready..."
kubectl rollout status deployment envoy-gateway -n envoy-gateway-system --timeout=90s

echo "📝 Applying GatewayClass and App Resources..."
kubectl apply -f infra/gatewayclass.yaml
kubectl apply -f infra/redis.yaml
kubectl apply -f infra/deployment.yaml
kubectl apply -f infra/gateway.yaml
kubectl apply -f infra/httproute.yaml

echo "🔧 Patching Envoy Service for Kind compatibility (NodePort)..."
# We wait for the service to be created by the controller
while ! kubectl get svc -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=cable-force-gateway 2>/dev/null | grep -q "envoy"; do
  echo "Waiting for Envoy service to be generated..."
  sleep 5
done

ENVOY_SVC=$(kubectl get svc -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=cable-force-gateway -o name)
kubectl patch $ENVOY_SVC -n envoy-gateway-system --type='json' -p='[{"op": "replace", "path": "/spec/type", "value":"NodePort"}, {"op": "replace", "path": "/spec/ports/0/nodePort", "value":30788}]'

echo "✅ Setup complete!"
echo "🎮 Access the game at: http://cableforce.127.0.0.1.nip.io"
echo "Note: If using Docker Desktop on Mac/Windows, ensure 'cableforce.127.0.0.1.nip.io' resolves to localhost."
