#Lista todos os pods no namespace default (para observar o hpa)
kubectl get pods -n default
watch kubectl get hpa #visualiza o hpa em ação
kubectl replace -f hpa.yaml #Força atualização do hpa

#Coletar senha do grafana
kubectl get secret monitoring-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

#Códigos importantes pro prometeus/grafana
kube_pod_status_phase{namespace="default", phase="Running"}



