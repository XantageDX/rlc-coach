import React, { createContext, useState, useContext } from 'react';

const ModelContext = createContext();

export const ModelProvider = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState('us.meta.llama3-1-8b-instruct-v1:0');
  
  const models = [
    { 
      id: 'us.meta.llama3-3-70b-instruct-v1:0', 
      name: 'Llama 3.3 70B Instruct' 
    },
    { 
      id: 'us.meta.llama3-1-8b-instruct-v1:0', 
      name: 'Llama 3.1 8B Instruct' 
    },
    { 
      id: 'mistral.mistral-7b-instruct-v0:2', 
      name: 'Mistral 7B Instruct' 
    },
    { 
      id: 'mistral.mixtral-8x7b-instruct-v0:1', 
      name: 'Mixtral 8x7B Instruct' 
    }
  ];

  return (
    <ModelContext.Provider value={{ selectedModel, setSelectedModel, models }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => useContext(ModelContext);