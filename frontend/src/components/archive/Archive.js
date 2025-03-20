// frontend/src/components/archive/Archive.js
import React, { useState, useEffect } from 'react';
import './../../styles/archive.css';
import archiveService from '../../services/archiveService';

const Archive = () => {
  const [projects, setProjects] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    // Fetch projects from the database
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      const data = await archiveService.getAllProjects();
      console.log("Projects data from API:", data); // Debug log
      
      // Check if data is array - if API returns empty array, that's fine
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        // If API returns something unexpected, set empty array
        console.warn("Expected array of projects, got:", data);
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      // Only set error if it's not just an empty result
      if (err.response && err.response.status !== 404) {
        setError('Failed to load archive projects');
      } else {
        // If it's a 404 or similar, just set empty projects
        setProjects([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle expansion of a tree item
  const toggleExpand = (itemType, itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemType + '-' + itemId]: !prev[itemType + '-' + itemId]
    }));
  };

  // Select an item to view its details
  const handleSelectItem = (itemType, item) => {
    setSelectedItem({
      type: itemType,
      data: item
    });
  };

  // Add a new project
  const handleAddProject = async () => {
    const projectName = prompt('Enter project name:');
    if (projectName && projectName.trim()) {
      try {
        const newProject = await archiveService.createProject({
          name: projectName.trim(),
          description: ''
        });
        setProjects([...projects, newProject]);
      } catch (err) {
        console.error('Error creating project:', err);
        setError('Failed to create project');
      }
    }
  };

  // Delete a project
  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This will also delete all key decisions and knowledge gaps.')) {
      try {
        await archiveService.deleteProject(projectId);
        setProjects(projects.filter(project => project._id !== projectId));
        if (selectedItem && selectedItem.type === 'project' && selectedItem.data._id === projectId) {
          setSelectedItem(null);
        }
      } catch (err) {
        console.error('Error deleting project:', err);
        setError('Failed to delete project');
      }
    }
  };

  // Add a new KD to a project
  const handleAddKD = async (projectId) => {
    // Create a custom popup dialog
    const kdInput = window.prompt("Enter Key Decision (format: KD ##: Title)", "KD ");
    
    if (kdInput) {
      // Parse the input to extract sequence and title
      const match = kdInput.match(/^KD\s*(\d+)\s*:\s*(.+)$/i);
      
      if (!match) {
        alert("Invalid format. Please use: KD ##: Title");
        return;
      }
      
      const kdSequence = match[1].padStart(2, '0'); // Ensure 2 digits (e.g., "01" instead of "1")
      const kdTitle = match[2].trim();
      
      try {
        const newKD = await archiveService.createKeyDecision(projectId, {
          title: kdTitle,
          sequence: kdSequence,
          description: ''
        });
        
        // Update projects state to include the new KD
        setProjects(projects.map(project => {
          if (project._id === projectId) {
            const updatedProject = { ...project };
            if (!updatedProject.keyDecisions) {
              updatedProject.keyDecisions = [];
            }
            updatedProject.keyDecisions.push(newKD);
            return updatedProject;
          }
          return project;
        }));
      } catch (err) {
        console.error('Error creating KD:', err);
        setError('Failed to create Key Decision');
      }
    }
  };

  // Delete a KD
  const handleDeleteKD = async (kdId, projectId) => {
    if (window.confirm('Are you sure you want to delete this Key Decision? This will also delete all associated Knowledge Gaps.')) {
      try {
        await archiveService.deleteKeyDecision(kdId);
        
        // Update the projects state to remove the deleted KD
        setProjects(projects.map(project => {
          if (project._id === projectId) {
            return {
              ...project,
              keyDecisions: project.keyDecisions.filter(kd => kd._id !== kdId)
            };
          }
          return project;
        }));
        
        // Clear selection if the deleted KD was selected
        if (selectedItem && selectedItem.type === 'kd' && selectedItem.data._id === kdId) {
          setSelectedItem(null);
        }
      } catch (err) {
        console.error('Error deleting key decision:', err);
        setError('Failed to delete key decision');
      }
    }
  };

  // Add a new KG to a KD
  const handleAddKG = async (kdId, kdSequence) => {
    // Create a custom popup dialog
    const kgInput = window.prompt(`Enter Knowledge Gap (format: KG ${kdSequence}-##: Title)`, `KG ${kdSequence}-`);
    
    if (kgInput) {
      // Parse the input to extract sequence and title
      const match = kgInput.match(new RegExp(`^KG\\s*${kdSequence}-\\s*(\\d+)\\s*:\\s*(.+)$`, 'i'));
      
      if (!match) {
        alert(`Invalid format. Please use: KG ${kdSequence}-##: Title`);
        return;
      }
      
      const kgNumber = match[1].padStart(2, '0'); // Ensure 2 digits
      const kgTitle = match[2].trim();
      
      try {
        const newKG = await archiveService.createKnowledgeGap(kdId, {
          title: kgTitle,
          sequence: kgNumber, // Just store the number part
          description: ''
        });
        
        // Update projects state to include the new KG
        setProjects(projects.map(project => {
          const updatedProject = { ...project };
          if (updatedProject.keyDecisions) {
            updatedProject.keyDecisions = updatedProject.keyDecisions.map(kd => {
              if (kd._id === kdId) {
                const updatedKd = { ...kd };
                if (!updatedKd.knowledgeGaps) {
                  updatedKd.knowledgeGaps = [];
                }
                updatedKd.knowledgeGaps.push(newKG);
                return updatedKd;
              }
              return kd;
            });
          }
          return updatedProject;
        }));
      } catch (err) {
        console.error('Error creating KG:', err);
        setError('Failed to create Knowledge Gap');
      }
    }
  };

  // Delete a KG
  const handleDeleteKG = async (kgId, kdId) => {
    if (window.confirm('Are you sure you want to delete this Knowledge Gap?')) {
      try {
        await archiveService.deleteKnowledgeGap(kgId);
        
        // Update the projects state to remove the deleted KG
        setProjects(projects.map(project => {
          return {
            ...project,
            keyDecisions: project.keyDecisions.map(kd => {
              if (kd._id === kdId) {
                return {
                  ...kd,
                  knowledgeGaps: kd.knowledgeGaps.filter(kg => kg._id !== kgId)
                };
              }
              return kd;
            })
          };
        }));
        
        // Clear selection if the deleted KG was selected
        if (selectedItem && selectedItem.type === 'kg' && selectedItem.data._id === kgId) {
          setSelectedItem(null);
        }
      } catch (err) {
        console.error('Error deleting knowledge gap:', err);
        setError('Failed to delete knowledge gap');
      }
    }
  };

  // const renderTree = () => {
  //   if (loading) return <div className="loading">Loading archive...</div>;
  //   if (error) return <div className="error-message">{error}</div>;
    
  //   return (
  //     <div className="archive-tree">
  //       {projects.length === 0 ? (
  //         <div className="no-items">No projects in archive. Use "+ Add Project" to get started.</div>
  //       ) : (
  //         projects.map(project => (
  //           <div key={project._id} className="tree-item project-item">
  //             <div 
  //               className="tree-item-header" 
  //               onClick={() => toggleExpand('project', project._id)}
  //             >
  //               <span className="expand-icon">
  //                 {expandedItems['project-' + project._id] ? '▼' : '►'}
  //               </span>
  //               <span 
  //                 className="item-title"
  //                 onClick={(e) => {
  //                   e.stopPropagation();
  //                   handleSelectItem('project', project);
  //                 }}
  //               >
  //                 {project.name}
  //               </span>
  //               <button
  //                 className="delete-icon"
  //                 onClick={(e) => {
  //                   e.stopPropagation();
  //                   handleDeleteProject(project._id);
  //                 }}
  //                 title="Delete project"
  //               >
  //                 ×
  //               </button>
  //             </div>
              
  //             {expandedItems['project-' + project._id] && (
  //               <div className="tree-children">
  //                 {/* Render KDs */}
  //                 {(project.keyDecisions || []).map(kd => (
  //                   <div key={kd._id} className="tree-item kd-item">
  //                     <div 
  //                       className="tree-item-header" 
  //                       onClick={() => toggleExpand('kd', kd._id)}
  //                     >
  //                       <span className="expand-icon">
  //                         {expandedItems['kd-' + kd._id] ? '▼' : '►'}
  //                       </span>
  //                       <span 
  //                         className="item-title"
  //                         onClick={(e) => {
  //                           e.stopPropagation();
  //                           handleSelectItem('kd', kd);
  //                         }}
  //                       >
  //                         KD {kd.sequence}: {kd.title}
  //                       </span>
  //                       <button
  //                         className="delete-icon"
  //                         onClick={(e) => {
  //                           e.stopPropagation();
  //                           handleDeleteKD(kd._id, project._id);
  //                         }}
  //                         title="Delete key decision"
  //                       >
  //                         ×
  //                       </button>
  //                     </div>
                      
  //                     {expandedItems['kd-' + kd._id] && (
  //                       <div className="tree-children">
  //                         {/* Render KGs */}
  //                         {(kd.knowledgeGaps || []).map(kg => (
  //                           <div key={kg._id} className="tree-item kg-item">
  //                             <div 
  //                               className="tree-item-header"
  //                             >
  //                               <span 
  //                                 className="item-title"
  //                                 onClick={() => handleSelectItem('kg', kg)}
  //                               >
  //                                 KG {kd.sequence}-{kg.sequence}: {kg.title}
  //                               </span>
  //                               <button
  //                                 className="delete-icon"
  //                                 onClick={(e) => {
  //                                   e.stopPropagation();
  //                                   handleDeleteKG(kg._id, kd._id);
  //                                 }}
  //                                 title="Delete knowledge gap"
  //                               >
  //                                 ×
  //                               </button>
  //                             </div>
  //                           </div>
  //                         ))}
                          
  //                         {/* Add KG button */}
  //                         <div className="tree-item add-item">
  //                           <button 
  //                             className="add-btn"
  //                             onClick={() => handleAddKG(kd._id, kd.sequence)}
  //                           >
  //                             + Add KG
  //                           </button>
  //                         </div>
  //                       </div>
  //                     )}
  //                   </div>
  //                 ))}
                  
  //                 {/* Add KD button */}
  //                 <div className="tree-item add-item">
  //                   <button 
  //                     className="add-btn"
  //                     onClick={() => handleAddKD(project._id)}
  //                   >
  //                     + Add KD
  //                   </button>
  //                 </div>
  //               </div>
  //             )}
  //           </div>
  //         ))
  //       )}
        
  //       {/* Make sure the Add Project button is OUTSIDE the projects map and ALWAYS shown */}
  //       <div className="tree-item add-item">
  //         <button 
  //           className="add-btn add-project-btn"
  //           onClick={handleAddProject}
  //         >
  //           + Add Project
  //         </button>
  //       </div>
  //     </div>
  //   );
  // };
  const renderTree = () => {
    // Always include the Add Project button, regardless of state
    const addProjectButton = (
      <div className="tree-item add-item add-project-container">
        <button 
          className="add-btn add-project-btn"
          onClick={handleAddProject}
        >
          + Add Project
        </button>
      </div>
    );
  
    if (loading) return (
      <div className="archive-tree">
        <div className="loading">Loading archive...</div>
        {addProjectButton}
      </div>
    );
    
    if (error) return (
      <div className="archive-tree">
        <div className="error-message">{error}</div>
        {addProjectButton}
      </div>
    );
    
    return (
      <div className="archive-tree">
        {/* Add Project button at the top, so it's always visible */}
        {addProjectButton}
        
        {projects.length === 0 ? (
          <div className="no-items">No projects in archive. Use the button above to get started.</div>
        ) : (
          projects.map(project => (
            <div key={project._id} className="tree-item project-item">
              <div 
                className="tree-item-header" 
                onClick={() => toggleExpand('project', project._id)}
              >
                <span className="expand-icon">
                  {expandedItems['project-' + project._id] ? '▼' : '►'}
                </span>
                <span 
                  className="item-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectItem('project', project);
                  }}
                >
                  {project.name}
                </span>
                <button
                  className="delete-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project._id);
                  }}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
              
              {expandedItems['project-' + project._id] && (
                <div className="tree-children">
                  {/* Render KDs */}
                  {(project.keyDecisions || []).map(kd => (
                    <div key={kd._id} className="tree-item kd-item">
                      <div 
                        className="tree-item-header" 
                        onClick={() => toggleExpand('kd', kd._id)}
                      >
                        <span className="expand-icon">
                          {expandedItems['kd-' + kd._id] ? '▼' : '►'}
                        </span>
                        <span 
                          className="item-title"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem('kd', kd);
                          }}
                        >
                          KD {kd.sequence}: {kd.title}
                        </span>
                        <button
                          className="delete-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKD(kd._id, project._id);
                          }}
                          title="Delete key decision"
                        >
                          ×
                        </button>
                      </div>
                      
                      {expandedItems['kd-' + kd._id] && (
                        <div className="tree-children">
                          {/* Render KGs */}
                          {(kd.knowledgeGaps || []).map(kg => (
                            <div key={kg._id} className="tree-item kg-item">
                              <div 
                                className="tree-item-header"
                              >
                                <span 
                                  className="item-title"
                                  onClick={() => handleSelectItem('kg', kg)}
                                >
                                  KG {kd.sequence}-{kg.sequence}: {kg.title}
                                </span>
                                <button
                                  className="delete-icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteKG(kg._id, kd._id);
                                  }}
                                  title="Delete knowledge gap"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add KG button */}
                          <div className="tree-item add-item">
                            <button 
                              className="add-btn"
                              onClick={() => handleAddKG(kd._id, kd.sequence)}
                            >
                              + Add KG
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add KD button */}
                  <div className="tree-item add-item">
                    <button 
                      className="add-btn"
                      onClick={() => handleAddKD(project._id)}
                    >
                      + Add KD
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // Render the document preview
  const renderDocumentPreview = () => {
    if (!selectedItem) {
      return (
        <div className="no-selection">
          <p>Select an item from the archive to view its details.</p>
        </div>
      );
    }

    const { type, data } = selectedItem;

    switch (type) {
      case 'project':
        return (
          <div className="document-preview">
            <h2>{data.name}</h2>
            <p className="description">{data.description || 'No description available.'}</p>
            <div className="document-actions">
              <button className="edit-btn">Edit Details</button>
            </div>
          </div>
        );
      
      case 'kd':
        return (
          <div className="document-preview">
            <h2>KD {data.sequence}: {data.title}</h2>
            <p className="description">{data.description || 'No description available.'}</p>
            <div className="document-actions">
              <button className="edit-btn">Edit Details</button>
              {data.document_url ? (
                <button className="view-doc-btn">View Document</button>
             ) : (
               <button className="upload-btn">Upload Document</button>
             )}
           </div>
         </div>
       );
     
     case 'kg':
       return (
         <div className="document-preview">
           <h2>KG {data.sequence}: {data.title}</h2>
           <p className="description">{data.description || 'No description available.'}</p>
           <div className="document-actions">
             <button className="edit-btn">Edit Details</button>
             {data.document_url ? (
               <button className="view-doc-btn">View Document</button>
             ) : (
               <button className="upload-btn">Upload Document</button>
             )}
           </div>
         </div>
       );
     
     default:
       return <div className="error-message">Unknown item type.</div>;
   }
 };

 return (
   <div className="archive-container">
     <h2>Archive</h2>
     <div className="archive-layout">
       <div className="archive-management">
         <h3>Archive Structure</h3>
         {renderTree()}
       </div>
       <div className="document-viewer">
         <h3>Document Preview</h3>
         {renderDocumentPreview()}
       </div>
     </div>
   </div>
 );
};

export default Archive;