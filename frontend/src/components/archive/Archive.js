// import React, { useState, useEffect } from 'react';
// import './../../styles/archive.css';
// import archiveService from '../../services/archiveService';

// const Archive = () => {
//   const [projects, setProjects] = useState([]);
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [newProjectName, setNewProjectName] = useState('');
//   const [fileToUpload, setFileToUpload] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [filesToUpload, setFilesToUpload] = useState([]);
//   const [uploadError, setUploadError] = useState('');


//   // Fetch projects on component mount
//   useEffect(() => {
//     fetchProjects();
//   }, []);

//   // Fetch all projects from the archive
//   const fetchProjects = async () => {
//     try {
//       setLoading(true);
//       const data = await archiveService.getAllProjects();
//       // Sort projects alphabetically by name
//       const sortedProjects = data.sort((a, b) => 
//         a.name.localeCompare(b.name)
//       );
//       setProjects(sortedProjects);
//       setLoading(false);
//     } catch (err) {
//       console.error('Error fetching projects:', err);
//       setError('Failed to load projects');
//       setLoading(false);
//     }
//   };

//   // Handle creating a new project
//   const handleAddProject = async () => {
//     if (!newProjectName.trim()) {
//       alert('Please enter a project name');
//       return;
//     }

//     try {
//       const newProject = await archiveService.createProject({
//         name: newProjectName.trim(),
//         description: ''
//       });
      
//       // Add new project to the list and sort
//       const updatedProjects = [...projects, newProject]
//         .sort((a, b) => a.name.localeCompare(b.name));
      
//       setProjects(updatedProjects);
//       setNewProjectName(''); // Clear input
//     } catch (err) {
//       console.error('Error creating project:', err);
      
//       // More detailed error handling
//       if (err.response) {
//         // The request was made and the server responded with a status code
//         // that falls out of the range of 2xx
//         setError(`Failed to create project: ${err.response.data.detail || 'Unknown error'}`);
//       } else if (err.request) {
//         // The request was made but no response was received
//         setError('No response received from server. Please check your network connection.');
//       } else {
//         // Something happened in setting up the request that triggered an Error
//         setError(`Error: ${err.message}`);
//       }
//     }
//   };

//   // Handle project selection
//   const handleProjectSelect = (project) => {
//     setSelectedProject(project);
//   };

//   // Handle file selection
//   const handleFileSelect = (e) => {
//     const files = Array.from(e.target.files);
//     const allowedTypes = [
//       'application/pdf',                     // PDF files
//       'application/vnd.ms-powerpoint',       // PPT files
//       'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX files
//       'application/msword',                  // DOC files
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   // DOCX files
//     ];

// // Replace handleFileSelect with this new version
// const handleFileSelect = (e) => {
//   const files = Array.from(e.target.files);
//   const allowedTypes = [
//     'application/pdf',                     // PDF files
//     'application/vnd.ms-powerpoint',       // PPT files
//     'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX files
//     'application/msword',                  // DOC files
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   // DOCX files
//   ];

//   // Filter invalid file types
//   const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
//   if (invalidFiles.length > 0) {
//     setUploadError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Only PDF, PPT, and Word documents are allowed.`);
//     e.target.value = ''; // Clear the input
//     return;
//   }

//   setUploadError('');
//   setFilesToUpload(files);
// };

//   // Handle file upload
//   const handleFileUpload = async () => {
//     if (!selectedProject) {
//       alert('Please select a project first');
//       return;
//     }
  
//     if (!filesToUpload.length) {
//       alert('Please select files to upload');
//       return;
//     }
  
//     try {
//       const uploadPromises = filesToUpload.map(file => 
//         archiveService.uploadDocument('project', selectedProject._id, file)
//       );
  
//       const uploadedDocs = await Promise.all(uploadPromises);
      
//       // Refresh the project details to show the new files
//       const updatedProjects = projects.map(proj => 
//         proj._id === selectedProject._id 
//           ? { 
//               ...proj, 
//               documents: proj.documents 
//                 ? [...proj.documents, ...uploadedDocs] 
//                 : uploadedDocs
//             } 
//           : proj
//       );
      
//       setProjects(updatedProjects);
//       setSelectedProject(
//         updatedProjects.find(proj => proj._id === selectedProject._id)
//       );
      
//       setFilesToUpload([]); // Clear the files
//       const fileInput = document.querySelector('input[type="file"]');
//       if (fileInput) fileInput.value = ''; // Clear the input
  
//       alert('Files uploaded successfully');
//     } catch (err) {
//       console.error('Error uploading files:', err);
//       alert('Failed to upload one or more files');
//     }
//   };

//     // Handle project deletion
//     const handleDeleteProject = async () => {
//       if (!selectedProject) return;
  
//       if (window.confirm(`Are you sure you want to delete project "${selectedProject.name}"?`)) {
//         try {
//           await archiveService.deleteProject(selectedProject._id);
          
//           // Remove project from state
//           setProjects(projects.filter(p => p._id !== selectedProject._id));
//           setSelectedProject(null);
          
//           // Show success message
//           alert('Project deleted successfully');
//         } catch (err) {
//           console.error('Error deleting project:', err);
//           alert('Failed to delete project');
//         }
//       }
//     };
  
//     // Handle file deletion
//     const handleDeleteFile = async (documentId, filename) => {
//       if (!selectedProject) return;
  
//       if (window.confirm(`Are you sure you want to delete file "${filename}"?`)) {
//         try {
//           await archiveService.deleteDocument(selectedProject._id, documentId);
          
//           // Update projects state
//           const updatedProjects = projects.map(proj => {
//             if (proj._id === selectedProject._id) {
//               return {
//                 ...proj,
//                 documents: proj.documents.filter(doc => doc._id !== documentId)
//               };
//             }
//             return proj;
//           });
          
//           setProjects(updatedProjects);
          
//           // Update selected project
//           setSelectedProject({
//             ...selectedProject,
//             documents: selectedProject.documents.filter(doc => doc._id !== documentId)
//           });
          
//           // Show success message
//           alert('File deleted successfully');
//         } catch (err) {
//           console.error('Error deleting file:', err);
//           alert('Failed to delete file');
//         }
//       }
//     };

//     return (
//       <div className="archive-container">
//         <h2>Archive</h2>
//         <div className="archive-layout">
//           {/* Archive Structure Column */}
//           <div className="archive-structure-column">
//             <h3>Archive Structure</h3>
//             <h4>Project Creation</h4>
            
//             {/* Project Creation Section */}
//             <div className="project-creation">
//               <input 
//                 type="text" 
//                 value={newProjectName}
//                 onChange={(e) => setNewProjectName(e.target.value)}
//                 placeholder="Enter project name"
//                 className="project-name-input"
//               />
//               <button 
//                 onClick={handleAddProject}
//                 className="add-project-btn"
//               >
//                 + Add Project
//               </button>
//             </div>
//             <br/>
  
//             {/* Projects List */}
//             <div className="projects-list">
//               <h3>Archived Projects</h3>
//               {loading ? (
//                 <p>Loading projects...</p>
//               ) : error ? (
//                 <p className="error">{error}</p>
//               ) : projects.length === 0 ? (
//                 <p>No projects in archive. Create one above.</p>
//               ) : (
//                 <ul>
//                   {projects.map(project => (
//                     <li 
//                       key={project._id} 
//                       onClick={() => handleProjectSelect(project)}
//                       className={selectedProject?._id === project._id ? 'selected' : ''}
//                     >
//                       {project.name}
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </div>
//           </div>
  
//           {/* Upload Projects Column */}
//           <div className="upload-projects-column">
//             <h3>Upload Projects</h3>
//             {selectedProject ? (
//               <div className="project-upload-section">
//                 <h4>Selected Project: {selectedProject.name}</h4>
                
//                 {/* Add project actions section */}
//                 <div className="project-actions">
//                   <button 
//                     className="delete-btn"
//                     onClick={handleDeleteProject}
//                   >
//                     Delete Project
//                   </button>
//                 </div>
  
//                 <div className="file-upload-controls">
//                   <div className="file-input-wrapper">
//                     <input 
//                       type="file" 
//                       onChange={handleFileSelect}
//                       multiple
//                       accept=".pdf,.doc,.docx,.ppt,.pptx"
//                     />
//                     <small className="file-types-hint">Allowed file types: PDF, PPT, DOC</small>
//                     {uploadError && <div className="upload-error">{uploadError}</div>}
//                   </div>
//                   <button 
//                     onClick={handleFileUpload}
//                     disabled={!filesToUpload.length}
//                   >
//                     Upload {filesToUpload.length ? `(${filesToUpload.length} files)` : ''}
//                   </button>
//                 </div>

//                 {/* Add selected files preview if you want */}
//                 {filesToUpload.length > 0 && (
//                   <div className="selected-files">
//                     <h4>Selected Files:</h4>
//                     <ul>
//                       {Array.from(filesToUpload).map((file, index) => (
//                         <li key={index}>{file.name}</li>
//                       ))}
//                     </ul>
//                   </div>
//                 )}
                
//                 {/* Display uploaded files */}
//                 <div className="uploaded-files">
//                   <h3>Uploaded Files:</h3>
//                   {selectedProject.documents && selectedProject.documents.length > 0 ? (
//                     <ul>
//                       {selectedProject.documents.map((doc) => (
//                         <li key={doc._id}>
//                           <span>{doc.filename}</span>
//                           <button
//                             className="delete-file-btn"
//                             onClick={() => handleDeleteFile(doc._id, doc.filename)}
//                           >
//                             Delete
//                           </button>
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <p>No files uploaded yet</p>
//                   )}
//                 </div>
//               </div>
//             ) : (
//               <p>Select a project to upload files</p>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   };


// export default Archive;
import React, { useState, useEffect } from 'react';
import './../../styles/archive.css';
import archiveService from '../../services/archiveService';
import axios from 'axios';

const Archive = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch all projects from the archive
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await archiveService.getAllProjects();
      // Sort projects alphabetically by name
      const sortedProjects = data.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setProjects(sortedProjects);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
      setLoading(false);
    }
  };

  // Handle creating a new project
  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      const newProject = await archiveService.createProject({
        name: newProjectName.trim(),
        description: ''
      });
      
      // Add new project to the list and sort
      const updatedProjects = [...projects, newProject]
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setProjects(updatedProjects);
      setNewProjectName(''); // Clear input
    } catch (err) {
      console.error('Error creating project:', err);
      
      // More detailed error handling
      if (err.response) {
        setError(`Failed to create project: ${err.response.data.detail || 'Unknown error'}`);
      } else if (err.request) {
        setError('No response received from server. Please check your network connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
    }
  };

  // Handle project selection
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = [
      'application/pdf',                     // PDF files
      'application/vnd.ms-powerpoint',       // PPT files
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX files
      'application/msword',                  // DOC files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   // DOCX files
    ];

    // Filter invalid file types
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setUploadError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Only PDF, PPT, and Word documents are allowed.`);
      e.target.value = ''; // Clear the input
      return;
    }

    setUploadError('');
    setFilesToUpload(files);
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    if (!filesToUpload.length) {
      alert('Please select files to upload');
      return;
    }

    try {
      const uploadPromises = filesToUpload.map(file => 
        archiveService.uploadDocument('project', selectedProject._id, file)
      );

      const uploadedDocs = await Promise.all(uploadPromises);
      
      // Refresh the project details to show the new files
      const updatedProjects = projects.map(proj => 
        proj._id === selectedProject._id 
          ? { 
              ...proj, 
              documents: proj.documents 
                ? [...proj.documents, ...uploadedDocs] 
                : uploadedDocs
            } 
          : proj
      );
      
      setProjects(updatedProjects);
      setSelectedProject(
        updatedProjects.find(proj => proj._id === selectedProject._id)
      );
      
      setFilesToUpload([]); // Clear the files
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = ''; // Clear the input

      alert('Files uploaded successfully');
    } catch (err) {
      console.error('Error uploading files:', err);
      alert('Failed to upload one or more files');
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    if (window.confirm(`Are you sure you want to delete project "${selectedProject.name}"?`)) {
      try {
        await archiveService.deleteProject(selectedProject._id);
        
        // Remove project from state
        setProjects(projects.filter(p => p._id !== selectedProject._id));
        setSelectedProject(null);
        
        // Show success message
        alert('Project deleted successfully');
      } catch (err) {
        console.error('Error deleting project:', err);
        alert('Failed to delete project');
      }
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (documentId, filename) => {
    if (!selectedProject) return;

    if (window.confirm(`Are you sure you want to delete file "${filename}"?`)) {
      try {
        await archiveService.deleteDocument(selectedProject._id, documentId);
        
        // Update projects state
        const updatedProjects = projects.map(proj => {
          if (proj._id === selectedProject._id) {
            return {
              ...proj,
              documents: proj.documents.filter(doc => doc._id !== documentId)
            };
          }
          return proj;
        });
        
        setProjects(updatedProjects);
        
        // Update selected project
        setSelectedProject({
          ...selectedProject,
          documents: selectedProject.documents.filter(doc => doc._id !== documentId)
        });
        
        // Show success message
        alert('File deleted successfully');
      } catch (err) {
        console.error('Error deleting file:', err);
        alert('Failed to delete file');
      }
    }
  };

  const handleFileDrop = (files) => {
    const allowedTypes = [
      'application/pdf',                     // PDF files
      'application/vnd.ms-powerpoint',       // PPT files
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX files
      'application/msword',                  // DOC files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   // DOCX files
    ];
    
    // Check file extensions for files that might not have the correct MIME type
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
    
    // Filter invalid files
    const invalidFiles = files.filter(file => {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      return !allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension);
    });
    
    if (invalidFiles.length > 0) {
      setUploadError(`Invalid file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Only PDF, PPT, and Word documents are allowed.`);
      return;
    }
    
    setUploadError('');
    setFilesToUpload(files);
  };

  // const handleOpenFile = async (documentId, filename) => {
  //   if (!selectedProject) return;
    
  //   try {
  //     // Get the auth token
  //     const user = JSON.parse(localStorage.getItem('user'));
  //     const token = user?.access_token;
      
  //     if (!token) {
  //       alert('Authentication token not found. Please log in again.');
  //       return;
  //     }
      
  //     // Use axios to get the file with authorization header
  //     const response = await axios({
  //       url: `http://localhost:8000/archive/projects/${selectedProject._id}/documents/${documentId}/view`,
  //       method: 'GET',
  //       responseType: 'blob', // Important for handling file downloads
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
      
  //     // Create a blob URL and open it
  //     const blob = new Blob([response.data]);
  //     const url = window.URL.createObjectURL(blob);
      
  //     // Create a temporary link and click it
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', filename); // Set the filename
  //     link.setAttribute('target', '_blank');
  //     document.body.appendChild(link);
  //     link.click();
      
  //     // Clean up
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error('Error opening file:', err);
  //     alert('Failed to open file: ' + (err.response?.data?.detail || err.message));
  //   }
  // };
  const handleOpenFile = async (documentId, filename) => {
    if (!selectedProject) return;
    
    try {
      // Create a URL with the token in the query string
      const user = JSON.parse(localStorage.getItem('user'));
      const token = user?.access_token;
      
      // Set up a global axios request interceptor to add the token to every request
      axios.interceptors.request.use(
        config => {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        },
        error => Promise.reject(error)
      );
      
      // For PDF, DOC, DOCX, PPT, PPTX files
      const fileExtension = filename.split('.').pop().toLowerCase();
      
      // For files that browsers can display
      if (['pdf'].includes(fileExtension)) {
        // For PDFs, we can display them directly in a new tab
        const response = await axios({
          url: `http://localhost:8000/archive/projects/${selectedProject._id}/documents/${documentId}/view`,
          method: 'GET',
          responseType: 'blob',
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        // For other file types, download them
        const response = await axios({
          url: `http://localhost:8000/archive/projects/${selectedProject._id}/documents/${documentId}/view`,
          method: 'GET',
          responseType: 'blob',
        });
        
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error opening file:', err);
      alert('Failed to open file: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="archive-container">
      <h2>Archive</h2>
      <div className="archive-layout">
        {/* Archive Structure Column */}
        <div className="archive-structure-column">
          <h3>Archive Structure</h3>
          <h4>Project Creation</h4>
          
          {/* Project Creation Section */}
          <div className="project-creation">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
              className="project-name-input"
            />
            <button 
              onClick={handleAddProject}
              className="add-project-btn"
            >
              + Add Project
            </button>
          </div>
          <br/>

          {/* Projects List */}
          <div className="projects-list">
            <h3>Archived Projects</h3>
            {loading ? (
              <p>Loading projects...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : projects.length === 0 ? (
              <p>No projects in archive. Create one above.</p>
            ) : (
              <ul>
                {projects.map(project => (
                  <li 
                    key={project._id} 
                    onClick={() => handleProjectSelect(project)}
                    className={selectedProject?._id === project._id ? 'selected' : ''}
                  >
                    {project.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upload Projects Column */}
        <div className="upload-projects-column">
          <h3>Upload Projects</h3>
          {selectedProject ? (
            <div className="project-upload-section">
              <h4>Selected Project: {selectedProject.name}</h4>
              
              {/* Add project actions section */}
              <div className="project-actions">
                <button 
                  className="delete-btn"
                  onClick={handleDeleteProject}
                >
                  Delete Project
                </button>
              </div>

              <div className="file-upload-controls">
                <div 
                  className={`dropzone ${filesToUpload.length > 0 ? 'active' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('active');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('active');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('active');
                    
                    const files = Array.from(e.dataTransfer.files);
                    handleFileDrop(files);
                  }}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input 
                    id="file-input"
                    type="file" 
                    onChange={handleFileSelect}
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    style={{ display: 'none' }}
                  />
                  {filesToUpload.length > 0 ? (
                    <div>
                      <p><strong>{filesToUpload.length} files selected</strong></p>
                      <p>Click to select different files or drop them here</p>
                    </div>
                  ) : (
                    <div>
                      <p><strong>Drag & drop files here</strong> or click to select</p>
                      <p className="file-types">Allowed file types: PDF, PPT, DOCX</p>
                    </div>
                  )}
                </div>
                {uploadError && <div className="upload-error">{uploadError}</div>}
                
                {filesToUpload.length > 0 && (
                  <button 
                    className="upload-btn"
                    onClick={handleFileUpload}
                  >
                    Upload {filesToUpload.length} {filesToUpload.length === 1 ? 'file' : 'files'}
                  </button>
                )}
              </div>

              {/* Show selected files preview */}
              {filesToUpload.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files:</h4>
                  <ul>
                    {Array.from(filesToUpload).map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Display uploaded files */}
              <div className="uploaded-files">
                <h3>Uploaded Files:</h3>
                {selectedProject.documents && selectedProject.documents.length > 0 ? (
                  <ul className="files-list">
                    {selectedProject.documents.map((doc) => {
                      // Determine embedding status
                      let embeddingStatus = 'processing';
                      let embeddingLabel = 'Processing';
                      
                      if (doc.embedded === true) {
                        embeddingStatus = 'success';
                        embeddingLabel = 'Embedded';
                      } else if (doc.embedded === false) {
                        embeddingStatus = 'failed';
                        embeddingLabel = 'Failed';
                      }
                      
                      return (
                        <li key={doc._id} className={`file-item ${embeddingStatus}`}>
                          <div className="file-info">
                            <span className="file-name" title={doc.filename}>{doc.filename}</span>
                            <div className="file-meta">
                              <span className="file-type">{doc.file_type?.toUpperCase() || ''}</span>
                              {doc.file_size && (
                                <span className="file-size">
                                  {Math.round(doc.file_size / 1024)} KB
                                </span>
                              )}
                              <span className={`embedding-badge ${embeddingStatus}`}>
                                {embeddingLabel}
                              </span>
                            </div>
                          </div>
                          <div className="file-actions">
                            <button
                              className="open-file-btn"
                              onClick={() => handleOpenFile(doc._id, doc.filename)}
                            >
                              Open
                            </button>
                            <button
                              className="delete-file-btn"
                              onClick={() => handleDeleteFile(doc._id, doc.filename)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No files uploaded yet</p>
                )}
              </div>
            </div>
          ) : (
            <p>Select a project to upload files</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;