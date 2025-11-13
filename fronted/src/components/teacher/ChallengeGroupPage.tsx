import { useState, useEffect } from "react";
import BlockItem from "./BlockItem.tsx";
import BlockForm from "./BlockForm.tsx";
import SelectChallengesModal from "./SelectChallengesModal.tsx";
import apiService from "../../services/api";
import type { Challenge, Block } from "../../types/block";

export default function ChallengeGroupPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      const data = await apiService.getChallengeGroups();
      
      // Har bir blok uchun alohida savollarni yuklaymiz
      const blocksWithChallenges = await Promise.all(
        data.map(async (block: Block) => {
          try {
            const fullBlock = await apiService.getChallengeGroup(block.id);
            
            // Ensure challenges is always an array of Challenge objects
            let challenges: Challenge[] = [];
            if (Array.isArray(fullBlock.challenges)) {
              // If it's an array of numbers (IDs), create minimal Challenge objects
              if (fullBlock.challenges.length > 0 && typeof fullBlock.challenges[0] === 'number') {
                challenges = (fullBlock.challenges as unknown as number[]).map(id => ({
                  id,
                  title: `Challenge ${id}`,
                  description: ''
                }));
              } else {
                // If it's already an array of Challenge objects, use as is
                challenges = fullBlock.challenges as unknown as Challenge[];
              }
            }
            
            return {
              ...fullBlock,
              challenges: challenges,
              challenges_count: challenges.length
            };
          } catch (error) {
            // Xatolik bo'lsa ham asosiy blok ma'lumotlarini qaytaramiz va challenges ni bo'sh qilamiz
            return {
              ...block,
              challenges: [],
              challenges_count: 0
            };
          }
        })
      );
      
      setBlocks(blocksWithChallenges);
    } catch (error) {
      alert('Bloklarni yuklashda xatolik yuz berdi');
    }
  }

  function openChallengeModal(block: Block) {
    setSelectedBlock(block);
    setShowChallengeModal(true);
  }

  async function handleDelete(id: number) {
    await apiService.deleteChallengeGroup(id);
    loadBlocks();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Bloklar Boshqaruvi</h1>
        <button 
          className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            showAddForm 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} mr-2`}></i>
          {showAddForm ? "Bekor qilish" : "Yangi blok qo'shish"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-blue-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Yangi blok qo'shish</h2>
          <BlockForm 
            onSaved={() => {
              setShowAddForm(false);
              loadBlocks();
            }}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {blocks.length > 0 ? (
          blocks.map((block: Block) => (
            <div key={block.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100">
              <BlockItem
                block={block}
                onEditSaved={loadBlocks}
                onDelete={() => handleDelete(block.id)}
                onOpenQuestions={() => openChallengeModal(block)}
              />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <i className="fas fa-inbox text-4xl"></i>
            </div>
            <p className="text-gray-500">Hozircha bloklar mavjud emas</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>Yangi blok qo'shish
            </button>
          </div>
        )}
      </div>

      {showChallengeModal && selectedBlock && (
        <SelectChallengesModal 
          block={selectedBlock}
          onClose={() => setShowChallengeModal(false)}
          onSaved={loadBlocks}
        />
      )}
    </div>
  );
}
