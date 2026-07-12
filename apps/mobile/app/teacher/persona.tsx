import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { UI_COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@dahamkee/shared/constants';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

export default function PersonaAdminScreen() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Array<{
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    language: string;
    avatarUrl: string;
    isActive: boolean;
  }>>([
    { id: '1', name: 'English Native', description: 'Friendly English tutor from the US', systemPrompt: 'You are a friendly and patient English tutor from the United States. Speak naturally using everyday American English. Encourage the student, correct mistakes gently, and keep conversations engaging. Use simple vocabulary appropriate for the student level.', language: 'en', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=english-native', isActive: true },
    { id: '2', name: 'Korean Native', description: '친절한 한국어 튜터', systemPrompt: '당신은 친절하고 인내심 있는 한국어 튜터입니다. 자연스러운 한국어로 대화하며, 학생의 수준에 맞춰 쉬운 어휘를 사용하세요. 실수를 부드럽게 교정하고, 격려하며 대화를 이어가세요. 한국 문화와 표현도 자연스럽게 알려주세요.', language: 'ko', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=korean-native', isActive: true },
    { id: '3', name: 'Chinese Native', description: '友好的中文导师', systemPrompt: '你是一位友好耐心的中文导师。用自然的中文交谈，根据学生水平使用合适的词汇。温和地纠正错误，鼓励学生，让对话保持趣味性。也可以分享中国文化和表达。', language: 'zh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chinese-native', isActive: true },
    { id: '4', name: 'Vietnamese Native', description: 'Giáo viên tiếng Việt thân thiện', systemPrompt: 'Bạn là một giáo viên tiếng Việt thân thiện và kiên nhẫn. Hãy nói tự nhiên bằng tiếng Việt, sử dụng từ vựng phù hợp với trình độ học viên. Khuyến khích học viên, sửa lỗi nhẹ nhàng, và duy trì cuộc hội thoại thú vị. Cũng có thể chia sẻ văn hóa và biểu đạt tiếng Việt.', language: 'vi', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vietnamese-native', isActive: true },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<typeof personas[0] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    language: 'ko',
    avatarUrl: '',
    isActive: true,
  });

  const handleAddPersona = () => {
    setEditingPersona(null);
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      language: 'ko',
      avatarUrl: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEditPersona = (persona: typeof personas[0]) => {
    setEditingPersona(persona);
    setFormData({
      name: persona.name,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      language: persona.language,
      avatarUrl: persona.avatarUrl,
      isActive: persona.isActive,
    });
    setShowModal(true);
  };

  const handleDeletePersona = (id: string) => {
    Alert.alert('삭제 확인', '이 페르소나를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => setPersonas(personas.filter(p => p.id !== id)) },
    ]);
  };

  const handleSavePersona = () => {
    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      Alert.alert('오류', '이름과 시스템 프롬프트는 필수입니다.');
      return;
    }

    if (editingPersona) {
      setPersonas(personas.map(p => p.id === editingPersona.id ? { ...p, ...formData } : p));
    } else {
      const newPersona = {
        ...formData,
        id: Date.now().toString(),
      };
      setPersonas([...personas, newPersona]);
    }
    setShowModal(false);
  };

  const getLanguageInfo = (code: string) => {
    return LANGUAGES.find(l => l.code === code) || { code, name: code, flag: '' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>< 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>페르소나 관리</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPersona}>
          <Text style={styles.addButtonText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {personas.map(persona => {
          const langInfo = getLanguageInfo(persona.language);
          return (
            <View key={persona.id} style={styles.personaCard}>
              <View style={styles.personaHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{langInfo.flag}</Text>
                </View>
                <View style={styles.personaInfo}>
                  <View style={styles.personaNameRow}>
                    <Text style={styles.personaName}>{persona.name}</Text>
                    <View style={[styles.statusBadge, persona.isActive ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>{persona.isActive ? '활성' : '비활성'}</Text>
                    </View>
                  </View>
                  <Text style={styles.personaDescription}>{persona.description}</Text>
                  <Text style={styles.personaLanguage}>{langInfo.name} ({langInfo.flag})</Text>
                </View>
              </View>
              <View style={styles.personaPrompt}>
                <Text style={styles.promptLabel}>시스템 프롬프트</Text>
                <Text style={styles.promptText}>{persona.systemPrompt}</Text>
              </View>
              <View style={styles.personaActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPersona(persona)}>
                  <Text style={styles.actionButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeletePersona(persona.id)}>
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPersona ? '페르소나 수정' : '페르소나 추가'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>이름 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="예: English Native"
                  value={formData.name}
                  onChangeText={text => setFormData({ ...formData, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>설명</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="페르소나에 대한 간단한 설명"
                  value={formData.description}
                  onChangeText={text => setFormData({ ...formData, description: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>언어 *</Text>
                <View style={styles.languageSelector}>
                  {LANGUAGES.map(lang => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.languageOption,
                        formData.language === lang.code && styles.languageOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, language: lang.code })}
                    >
                      <Text style={styles.languageOptionText}>{lang.flag} {lang.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>시스템 프롬프트 *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="페르소나의 행동 지침을 작성하세요..."
                  value={formData.systemPrompt}
                  onChangeText={text => setFormData({ ...formData, systemPrompt: text })}
                  multiline
                  numberOfLines={6}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>아바타 URL (선택)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://..."
                  value={formData.avatarUrl}
                  onChangeText={text => setFormData({ ...formData, avatarUrl: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.isActive ? styles.toggleActive : styles.toggleInactive,
                  ]}
                  onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                >
                  <Text style={styles.toggleText}>{formData.isActive ? '활성화' : '비활성화'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePersona}>
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surface,
  },
  backButton: {
    paddingHorizontal: SPACING.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: UI_COLORS.primary,
    fontFamily: 'Nunito',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  addButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: UI_COLORS.primary,
    borderRadius: BORDER_RADIUS,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  personaCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  personaHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  personaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  personaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  personaName: {
    fontSize: 16,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: UI_COLORS.success + '20',
  },
  statusInactive: {
    backgroundColor: UI_COLORS.textSecondary + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Nunito',
  },
  personaDescription: {
    fontSize: 13,
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
    marginBottom: SPACING.xs,
  },
  personaLanguage: {
    fontSize: 12,
    color: UI_COLORS.primary,
    fontFamily: 'Nunito',
    fontWeight: '600',
  },
  personaPrompt: {
    backgroundColor: UI_COLORS.background,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: UI_COLORS.textSecondary,
    fontFamily: 'Nunito',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  promptText: {
    fontSize: 13,
    color: UI_COLORS.textPrimary,
    fontFamily: 'Nunito',
  },
  personaActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  deleteButton: {
    borderColor: UI_COLORS.error,
  },
  deleteButtonText: {
    color: UI_COLORS.error,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
    zIndex: 1000,
  },
  modal: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: BORDER_RADIUS,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: UI_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: UI_COLORS.textSecondary,
  },
  modalContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  formGroup: {
    gap: SPACING.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Nunito',
  },
  formInput: {
    backgroundColor: UI_COLORS.background,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
  },
  formTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  languageSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  languageOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.background,
  },
  languageOptionSelected: {
    backgroundColor: UI_COLORS.primary,
    borderColor: UI_COLORS.primary,
  },
  languageOptionText: {
    fontSize: 13,
    fontFamily: 'Nunito',
    color: UI_COLORS.textPrimary,
  },
  toggleButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: UI_COLORS.success,
  },
  toggleInactive: {
    backgroundColor: UI_COLORS.textSecondary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: UI_COLORS.border,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_COLORS.textPrimary,
    fontFamily: 'Quicksand',
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
    backgroundColor: UI_COLORS.primary,
    ...SHADOWS.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
});