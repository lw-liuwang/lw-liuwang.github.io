interface Project {
  name: string;
  organization: string;
  avatar?: string;
}

const projects: Record<string, Project> = {
  'googlecolab/google-colab-cli': {
    name: 'Colab CLI',
    organization: 'Google Colaboratory',
    avatar: '/google.svg',
  },
  'vllm-project/vllm': {
    name: 'vLLM',
    organization: 'vLLM Project',
    avatar: '/vllm.png',
  },
  'sgl-project/sglang-jax': {
    name: 'SGLang JAX',
    organization: 'SGLang',
    avatar: '/sglang.png',
  },
  'D-Robotics/openpi_runtime': {
    name: 'OpenPI Runtime',
    organization: 'D-Robotics',
    avatar: '/d-robotics.png',
  },
};

export function getProject(repository: string): Project {
  const [organization, name] = repository.split('/');
  return projects[repository] ?? { name, organization };
}
