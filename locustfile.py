from locust import HttpUser, task, between

class MicroservicesUser(HttpUser):
    wait_time = between(1, 2)

    @task(1)
    def create_short_link_grpc(self):
        self.client.post("/url", 
                         json={"url": "https://www.google.com"},
                         headers={"x-protocol-choice": "grpc"})

    @task(1)
    def create_short_link_rest(self):
        self.client.post("/url", 
                         json={"url": "https://www.google.com"},
                         headers={"x-protocol-choice": "rest"})

    @task(1)
    def generate_qr_grpc(self):
        self.client.post("/qr", 
                         json={"text": "https://www.google.com"},
                         headers={"x-protocol-choice": "grpc"})
    
    @task(1)
    def generate_qr_rest(self):
        self.client.post("/qr", 
                         json={"text": "https://www.google.com"},
                         headers={"x-protocol-choice": "rest"})

