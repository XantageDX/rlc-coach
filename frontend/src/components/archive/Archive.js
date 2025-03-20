import React, { useState, useEffect } from 'react';
import './../../styles/archive.css';
import archiveService from '../../services/archiveService';

const Archive = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
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
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(`Failed to create project: ${err.response.data.detail || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response received from server. Please check your network connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
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
    const file = e.target.files[0];
    setFileToUpload(file);
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    if (!fileToUpload) {
      alert('Please select a file to upload');
      return;
    }

    try {
      // Upload document to the selected project
      await archiveService.uploadDocument(
        'project', 
        selectedProject._id, 
        fileToUpload
      );
      
      // Refresh the project details to show the new file
      const updatedProjects = projects.map(proj => 
        proj._id === selectedProject._id 
          ? { 
              ...proj, 
              documents: proj.documents 
                ? [...proj.documents, { filename: fileToUpload.name }] 
                : [{ filename: fileToUpload.name }]
            } 
          : proj
      );
      
      setProjects(updatedProjects);
      setSelectedProject(
        updatedProjects.find(proj => proj._id === selectedProject._id)
      );
      
      setFileToUpload(null);
      alert('File uploaded successfully');
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
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
              <div className="file-upload-controls">
                <input 
                  type="file" 
                  onChange={handleFileSelect}
                />
                <button 
                  onClick={handleFileUpload}
                  disabled={!fileToUpload}
                >
                  Upload
                </button>
              </div>
              <br/>
              {/* Display uploaded files */}
              <div className="uploaded-files">
                <h3>Uploaded Files:</h3>
                {selectedProject.documents && selectedProject.documents.length > 0 ? (
                  <ul>
                    {selectedProject.documents.map((doc, index) => (
                      <li key={index}>{doc.filename}</li>
                    ))}
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