import { useState } from "react";
import BlockForm from "./BlockForm";
import type { BlockItemProps } from "../../types/block";

export default function BlockItem({ 
  block, 
  onEditSaved, 
  onDelete, 
  onOpenQuestions 
}: BlockItemProps) {
  const [editing, setEditing] = useState(false);

  const handleOpenQuestions = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenQuestions(block);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };
  
  const handleAddQuestions = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenQuestions(block);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <div className="p-5 flex-1">
        {!editing ? (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{block.title}</h3>
                {block.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{block.description}</p>
                )}
              </div>
              <span className={`ml-3 flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                block.is_private 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${block.is_private ? 'bg-red-500' : 'bg-green-500'}`}></span>
                {block.is_private ? 'Maxfiy' : 'Ommaviy'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="space-y-1">
                <div className="flex items-center">
                  <i className="far fa-calendar-alt text-blue-500 w-5 mr-2"></i>
                  <span className="font-medium">Boshlanish:</span>
                  <span className="ml-2">{block.start_time || "—"}</span>
                </div>
                <div className="flex items-center">
                  <i className="far fa-calendar-check text-blue-500 w-5 mr-2"></i>
                  <span className="font-medium">Tugash:</span>
                  <span className="ml-2">{block.end_time || "—"}</span>
                </div>
              </div>
              <div className="flex items-center mt-2">
                <i className="fas fa-tasks text-blue-500 w-5 mr-2"></i>
                <span className="font-medium text-sm">Savollar soni:</span>
                <span className="ml-2 font-semibold">
                  {(block.challenges_count || (block.challenges ? block.challenges.length : 0))} ta
                </span>
                {((block.challenges_count || 0) > 0 || (block.challenges && block.challenges.length > 0)) && (
                  <button 
                    onClick={handleOpenQuestions}
                    className="ml-3 inline-flex items-center px-3 py-1 border border-blue-200 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    <i className="fas fa-eye mr-1.5 text-blue-600"></i> Ko'rish
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={handleEditClick}
                  className="px-3 py-1.5 bg-white border border-blue-600 text-blue-600 text-sm rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200 flex items-center"
                >
                  <i className="far fa-edit mr-1.5 text-sm"></i>
                  Tahrirlash
                </button>

                <button 
                  onClick={handleAddQuestions}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200 flex items-center"
                >
                  <i className="fas fa-plus-circle mr-1.5 text-sm"></i>
                  Savol qo'shish
                </button>

                <button 
                  onClick={handleDeleteClick}
                  className="px-3 py-1.5 bg-white border border-red-600 text-red-600 text-sm rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors duration-200 flex items-center ml-auto"
                >
                  <i className="far fa-trash-alt mr-1.5 text-sm"></i>
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Blokni tahrirlash</h3>
              <button 
                onClick={() => setEditing(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Bekor qilish"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <BlockForm 
              block={block}
              onSaved={() => {
                setEditing(false);
                onEditSaved();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
