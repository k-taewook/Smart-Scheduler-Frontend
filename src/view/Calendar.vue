<template>
  <div :class="['calendar-page', { 'dark-mode': isDarkMode }]">
    <h1 class="title">📆 스마트 캘린더</h1>

    <!-- 다크 모드 토글 버튼 -->
    <button 
      @click="toggleDarkMode" 
      class="dark-mode-toggle top-left"
      aria-label="다크 모드 토글"
    >
      🌙
    </button>

    <div class="main-content">
      <!-- AI 인사이트 패널 -->
      <div class="ai-insights-panel" v-if="showInsights">
        <h2>🤖 AI 인사이트</h2>
        
        <!-- 전체 삭제 버튼 -->
        <button 
          @click="confirmDeleteAll" 
          class="delete-all-button"
          aria-label="모든 일정 삭제"
        >
          🗑️ 모든 일정 삭제
        </button>

        <!-- 주간 요약 -->
        <div class="insight-section">
          <h3>📊 이번 주 요약</h3>
          <div v-if="weeklySummary">
            <p>총 일정: {{ weeklySummary.total_schedules || 0 }}개</p>
            <p>총 시간: {{ weeklySummary.total_hours || 0 }}시간</p>
            <p>가장 바쁜 날: {{ weeklySummary.busiest_day || '없음' }}</p>
            
            <div class="free-time-slots" v-if="weeklySummary.free_time_slots && weeklySummary.free_time_slots.length > 0">
              <h4>자유 시간대:</h4>
              <ul>
                <template v-for="(slots, day) in groupedTimeSlots" :key="day">
                  <li>
                    {{ day }}요일: 
                    <span v-for="(slot, index) in slots" :key="index" class="time-slot">
                      {{ slot.replace(day + '요일 ', '') }}{{ index < slots.length - 1 ? ', ' : '' }}
                    </span>
                  </li>
                </template>
              </ul>
            </div>
            <p v-else>자유 시간대 정보 없음</p>
          </div>
          <p v-else>주간 요약 데이터를 불러오는 중...</p>
        </div>

        <!-- 일정 패턴 -->
        <div class="insight-section">
          <h3>📈 일정 패턴</h3>
          <div v-if="schedulePatterns">
            <p>자주 있는 일정 시간: {{ schedulePatterns.common_schedule_time || '없음' }}</p>
            <p>평균 일정 시간: {{ schedulePatterns.average_duration || '없음' }}</p>
            <div class="improvement-suggestions" v-if="schedulePatterns.improvement_suggestions && schedulePatterns.improvement_suggestions.length > 0">
              <h4>개선 제안:</h4>
              <ul>
                <li v-for="suggestion in schedulePatterns.improvement_suggestions" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
            <p v-else>개선 제안 없음</p>
          </div>
          <p v-else>일정 패턴 데이터를 불러오는 중...</p>
        </div>
      </div>

      <div class="calendar-section">
        <!-- 자연어 입력 -->
        <div class="natural-input-form">
          <textarea 
            v-model="naturalInput" 
            placeholder="예: 5월 10일 15:00부터 16:30까지 팀 미팅"
            aria-label="자연어 입력"
            @keydown.enter.prevent="addEventFromNaturalLanguage"
          ></textarea>
          <button 
            @click="addEventFromNaturalLanguage"
            aria-label="자연어로 일정 추가"
          >
            자연어로 일정 추가
          </button>
        </div>

        <vue-cal
          v-if="calendarVisible"
          class="my-calendar"
          style="height: 700px"
          :default-view="'month'"
          :disable-views="['years', 'day']"
          :events="events"
          @event-click="openEditModal"
          locale="ko"
          :week-start="0"
        />
      </div>
    </div>

    <!-- 일정 수정 모달 -->
    <div v-if="editingEvent" class="modal-backdrop">
      <div class="modal">
        <h2>일정 수정</h2>
        <input 
          v-model="editingEvent.content" 
          type="text"
          aria-label="일정 제목 수정"
        />
        <input 
          v-model="editingEventStartDate" 
          type="date"
          aria-label="일정 시작일 수정"
        />
        <input 
          v-model="editingEventStartTime" 
          type="time"
          aria-label="일정 시작시간 수정"
        />
        <input 
          v-model="editingEventEndDate" 
          type="date"
          aria-label="일정 종료일 수정"
        />
        <input 
          v-model="editingEventEndTime" 
          type="time"
          aria-label="일정 종료시간 수정"
        />
        <div class="modal-buttons">
          <button @click="saveEdit" aria-label="일정 수정 저장">저장</button>
          <button @click="deleteEvent" aria-label="일정 삭제">삭제</button>
          <button @click="cancelEdit" aria-label="수정 취소">취소</button>
        </div>
      </div>
    </div>

    <!-- 일정 충돌 알림 모달 -->
    <div v-if="showConflictModal" class="modal-backdrop">
      <div class="modal">
        <h2>⚠️ 일정 충돌</h2>
        <p>{{ scheduleConflicts.length > 0 ? scheduleConflicts[0].content + ' : ' + scheduleConflicts[0].start + ' ~ ' + scheduleConflicts[0].end : '해당 시간에 이미 일정이 있습니다.' }}</p>
        
        <h3>추천 시간:</h3>
        <div class="suggested-times">
          <div v-for="(time, index) in suggestedTimes" :key="index" class="suggestion-card">
            <p>{{ time.start }} ~ {{ time.end }}</p>
            <p class="reason">{{ time.reason }}</p>
            <button @click="useSuggestedTime(time)">이 시간으로 변경</button>
          </div>
        </div>
        
        <div class="modal-buttons">
          <button @click="confirmAddEvent">그래도 추가</button>
          <button @click="cancelAddEvent">취소</button>
        </div>
      </div>
    </div>

    <!-- 전체 삭제 확인 모달 -->
    <div v-if="showDeleteAllModal" class="modal-backdrop">
      <div class="modal">
        <h2>⚠️ 모든 일정 삭제</h2>
        <p>정말로 모든 일정을 삭제하시겠습니까?</p>
        <p>이 작업은 되돌릴 수 없습니다.</p>
        <div class="modal-buttons">
          <button @click="deleteAllEvents" class="danger">삭제</button>
          <button @click="showDeleteAllModal = false">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';
import moment from 'moment';

export default {
  name: "CalendarPage",
  components: { VueCal },
  data() {
    return {
      calendarVisible: false,
      naturalInput: "", // 자연어 입력에 사용되는 변수
      events: [],
      editingEvent: null,
      editingEventIndex: null,
      editingEventStartDate: "",
      editingEventStartTime: "",
      editingEventEndDate: "",
      editingEventEndTime: "",
      isDarkMode: false,
      showInsights: true,
      weeklySummary: null,
      schedulePatterns: null,
      showConflictModal: false,
      scheduleConflicts: [],
      suggestedTimes: [],
      pendingEvent: null,
      showDeleteAllModal: false,
      categories: {
        "미팅": "event-blue",
        "수업": "event-green",
        "개인": "event-purple",
        "기타": "event-orange"
      },
      notificationCheckInterval: null, // 알림 체크 인터벌
      sentNotifications: new Set(), // 이미 보낸 알림 추적
    };
  },
  mounted() {
    setTimeout(() => {
      this.calendarVisible = true;
    }, 50);

    // 기존 일정 로드
    this.loadEvents();

    // 알림 권한 요청
    this.requestNotificationPermission();

    // 알림 체크 시작
    this.startNotificationCheck();
  },
  beforeUnmount() {
    // 컴포넌트가 제거될 때 인터벌 정리
    if (this.notificationCheckInterval) {
      clearInterval(this.notificationCheckInterval);
    }
  },
  methods: {
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      document.body.classList.toggle('dark-mode', this.isDarkMode);
    },

    async addEventFromNaturalLanguage() {
      if (!this.naturalInput.trim()) return;

      try {
        // 삭제 명령어 확인
        const isDeleteCommand = this.naturalInput.includes('삭제') || 
                              this.naturalInput.includes('지우') || 
                              this.naturalInput.includes('취소');

        const endpoint = isDeleteCommand ? 'delete_schedule' : 'parse_schedule';
        const response = await fetch(`http://localhost:8000/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: this.naturalInput })
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) {
            // 충돌이 발생한 경우
            this.scheduleConflicts = errorData.detail.conflicts.map(conflict => ({
              id: Date.now() + Math.random(), // 고유 ID 생성
              content: conflict.title,
              start: moment(conflict.start_date_time).format("YYYY-MM-DD HH:mm"),
              end: moment(conflict.end_date_time).format("YYYY-MM-DD HH:mm")
            }));
            
            // 충돌 모달 표시
            this.showConflictModal = true;
            // pendingEvent에 현재 추가하려던 일정을 저장
            const pendingSchedule = result; // 파싱된 일정 데이터를 pendingEvent로 사용
            this.pendingEvent = {
                id: Date.now() + Math.random(), // 고유 ID 생성
                content: pendingSchedule.title,
                start: moment(pendingSchedule.start_date_time).format("YYYY-MM-DD HH:mm"),
                end: moment(pendingSchedule.end_date_time).format("YYYY-MM-DD HH:mm"),
                category: pendingSchedule.category,
                class: this.categories[pendingSchedule.category],
            };

            return; // 충돌 모달을 표시했으므로 함수 종료
          }
          // 409 에러가 아닌 다른 HTTP 에러는 여기서 처리
          alert(errorData.detail || (isDeleteCommand ? '일정 삭제에 실패했습니다' : '일정 파싱에 실패했습니다'));
          return; // 알림을 표시했으므로 함수 종료
        }

        const result = await response.json();
        console.log('자연어 처리 결과:', result);
        
        if (isDeleteCommand) {
          // 삭제 성공 메시지 표시
          alert(result.message);
          // 캘린더 새로고침
          await this.loadEvents();
        } else {
          // 기존 일정 추가 로직
          const parsedData = result;
          
          // 반복 일정인 경우
          if (parsedData.is_recurring) {
            const startDate = moment(parsedData.start_date_time);
            const endDate = moment(parsedData.recurrence_end_date);
            const duration = moment(parsedData.end_date_time).diff(moment(parsedData.start_date_time));
            
            let currentDate = startDate;
            
            while (currentDate.isSameOrBefore(endDate)) {
              // 주간 반복인 경우 지정된 요일에만 일정 생성
              if (parsedData.recurrence_rule === "WEEKLY" && parsedData.recurrence_days) {
                const currentDay = currentDate.format("dddd").toUpperCase();
                if (!parsedData.recurrence_days.includes(currentDay)) {
                  currentDate.add(1, 'day');
                  continue;
                }
              }
              
              const event = {
                id: Date.now() + Math.random(),
                content: parsedData.title,
                start: currentDate.format("YYYY-MM-DD HH:mm"),
                end: currentDate.clone().add(duration, 'milliseconds').format("YYYY-MM-DD HH:mm"),
                category: parsedData.category,
                class: this.categories[parsedData.category],
              };
              
              this.events.push(event);
              
              // 다음 반복 일정 계산
              if (parsedData.recurrence_rule === "DAILY") {
                currentDate.add(1, 'day');
              } else if (parsedData.recurrence_rule === "WEEKLY") {
                currentDate.add(1, 'week');
              } else if (parsedData.recurrence_rule === "MONTHLY") {
                currentDate.add(1, 'month');
              } else if (parsedData.recurrence_rule === "YEARLY") {
                currentDate.add(1, 'year');
              }
            }
          } else {
            // 일반 일정
            const event = {
              id: Date.now() + Math.random(),
              content: parsedData.title,
              start: moment(parsedData.start_date_time).format("YYYY-MM-DD HH:mm"),
              end: moment(parsedData.end_date_time).format("YYYY-MM-DD HH:mm"),
              category: parsedData.category,
              class: this.categories[parsedData.category],
            };
            
            this.events.push(event);
          }
          
          // 일정 저장 후 다시 로드
          await this.saveEvents();
          await this.loadEvents();
        }
        
        this.naturalInput = ""; // 입력 필드 초기화
      } catch (error) {
        console.error('일정 처리 중 오류 발생:', error);
        // 여기서 alert를 제거하여 409 에러가 이 catch 블록으로 넘어오더라도 브라우저 알림이 뜨지 않게 함
        // alert(error.message);
      }
    },

    async saveEvents() {
      try {
        console.log('일정 저장 시작:', this.events);
        
        // 백엔드에 일정 저장
        const response = await fetch('http://localhost:8000/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.events)
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) {
            // 충돌이 발생한 경우
            this.scheduleConflicts = errorData.detail.conflicts.map(conflict => ({
              id: Date.now() + Math.random(), // 고유 ID 생성
              content: conflict.title,
              start: moment(conflict.start_date_time).format("YYYY-MM-DD HH:mm"),
              end: moment(conflict.end_date_time).format("YYYY-MM-DD HH:mm")
            }));
            
            // 충돌 모달 표시
            this.showConflictModal = true;
            // 409 에러는 여기서 완전히 처리되었으므로 함수 종료
            return;
          } else {
            // 409가 아닌 다른 종류의 에러 처리
            alert(errorData.detail || '일정 저장에 실패했습니다.');
            return; // 에러 알림을 표시했으므로 함수 종료
          }
        }

        const result = await response.json();
        console.log('일정 저장 결과:', result);

        // 로컬 스토리지에도 저장
        localStorage.setItem('events', JSON.stringify(this.events));
        
        // 일정 저장 후 다시 로드하여 최신 상태 유지
        await this.loadEvents();
      } catch (error) {
        console.error('일정 저장 중 오류:', error);
        // 이곳의 alert는 이제 409 에러 때문에 호출되지 않습니다.
        // alert(error.message);
        // 예상치 못한 다른 오류 발생 시 사용자에게 알릴 수 있습니다.
         alert('일정 저장 중 예상치 못한 오류가 발생했습니다.');
      }
    },

    // 일정 로드
    async loadEvents() {
      try {
        const response = await fetch('http://localhost:8000/schedules');
        if (response.ok) {
          const schedules = await response.json();
          this.events = schedules.map(schedule => ({
            id: schedule.id || Date.now() + Math.random(),
            content: schedule.title,
            start: moment(schedule.start_date_time).format("YYYY-MM-DD HH:mm"),
            end: moment(schedule.end_date_time).format("YYYY-MM-DD HH:mm"),
            category: schedule.category,
            class: this.categories[schedule.category],
          }));
          
          // 일정 로드 후 인사이트 업데이트
          await this.loadInsights();
        } else {
          console.error('일정 로드 실패:', response.status);
        }
      } catch (error) {
        console.error('일정 로드 중 오류 발생:', error);
      }
    },

    getRandomColorClass() {
      return this.categories[this.newEventCategory];
    },

    // 일정 수정 모달 열기
    openEditModal(event) {
      this.editingEventIndex = this.events.indexOf(event);
      this.editingEvent = { ...event }; // 원본 이벤트를 복사하여 수정

      const start = moment(event.start);
      const end = moment(event.end);

      this.editingEventStartDate = start.format("YYYY-MM-DD");
      this.editingEventStartTime = start.format("HH:mm");
      this.editingEventEndDate = end.format("YYYY-MM-DD");
      this.editingEventEndTime = end.format("HH:mm");
    },

    // 일정 수정 저장
    async saveEdit() {
      if (!this.editingEvent.content || !this.editingEventStartDate || !this.editingEventStartTime || 
          !this.editingEventEndDate || !this.editingEventEndTime) {
        alert("제목, 시작일, 시작시간, 종료일, 종료시간을 모두 입력해주세요.");
        return;
      }

      const start = moment(`${this.editingEventStartDate} ${this.editingEventStartTime}`);
      const end = moment(`${this.editingEventEndDate} ${this.editingEventEndTime}`);
      
      if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
        alert("올바른 시간 형식을 사용해주세요.");
        return;
      }

      // 수정된 일정 반영
      this.editingEvent.start = start.format("YYYY-MM-DD HH:mm");
      this.editingEvent.end = end.format("YYYY-MM-DD HH:mm");

      // 배열의 해당 인덱스를 찾아 수정
      this.events.splice(this.editingEventIndex, 1, { ...this.editingEvent });

      // 저장하고 인사이트 업데이트
      await this.saveEvents();

      // 수정 후 모달 종료
      this.cancelEdit();
    },

    // 일정 삭제
    async deleteEvent() {
      if (this.editingEvent && this.editingEventIndex !== null) {
        const eventId = this.editingEvent.id;
        const index = this.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
          this.events.splice(index, 1);
          await this.saveEvents();
        }
      }
      this.cancelEdit();
    },

    // 수정 취소 및 모달 종료
    cancelEdit() {
      this.editingEvent = null;
      this.editingEventIndex = null;
    },

    async loadInsights() {
      try {
        console.log('인사이트 로드 시작');
        
        // 주간 요약 가져오기
        const summaryResponse = await fetch('http://localhost:8000/weekly_summary');
        if (!summaryResponse.ok) {
          throw new Error('주간 요약을 가져오는데 실패했습니다.');
        }
        const summaryData = await summaryResponse.json();
        
        // 자유 시간대가 비어있는 날은 00:00~23:59로 표시
        if (summaryData.free_time_slots) {
          const days = ['월', '화', '수', '목', '금', '토', '일'];
          
          days.forEach(day => {
            const daySchedules = summaryData.free_time_slots.filter(slot => slot.startsWith(day));
            if (daySchedules.length === 0) {
              summaryData.free_time_slots.push(`${day}요일 00:00~23:59`);
            }
          });
        }
        
        this.weeklySummary = summaryData;
        console.log('주간 요약 데이터:', JSON.stringify(summaryData, null, 2));

        // 일정 패턴 가져오기
        const patternsResponse = await fetch('http://localhost:8000/schedule_patterns');
        if (!patternsResponse.ok) {
          throw new Error('일정 패턴을 가져오는데 실패했습니다.');
        }
        const patternsData = await patternsResponse.json();
        this.schedulePatterns = patternsData;
        console.log('일정 패턴 데이터:', JSON.stringify(patternsData, null, 2));
      } catch (error) {
        console.error('인사이트 로드 중 오류:', error);
        // 오류 발생 시 기본값 설정
        this.weeklySummary = {
          total_schedules: 0,
          total_hours: 0,
          busiest_day: "데이터 로드 실패",
          free_time_slots: []
        };
        this.schedulePatterns = {
          common_schedule_time: "데이터 로드 실패",
          average_duration: "데이터 로드 실패",
          improvement_suggestions: ["데이터를 불러오는데 실패했습니다."]
        };
      }
    },

    useSuggestedTime(time) {
      if (this.pendingEvent) {
        this.pendingEvent.start = time.start;
        this.pendingEvent.end = time.end;
        this.events.push(this.pendingEvent);
        this.saveEvents();
        this.clearEventForm();
        this.showConflictModal = false;
      }
    },

    confirmAddEvent() {
      if (this.pendingEvent) {
        this.events.push(this.pendingEvent);
        this.saveEvents();
        this.clearEventForm();
        this.showConflictModal = false;
      }
    },

    cancelAddEvent() {
      this.pendingEvent = null;
      this.showConflictModal = false;
    },

    clearEventForm() {
      this.newEventTitle = "";
      this.newEventCategory = "기타";
      this.newEventStartDate = "";
      this.newEventStartTime = "";
      this.newEventEndDate = "";
      this.newEventEndTime = "";
      this.pendingEvent = null;
    },

    async confirmDeleteAll() {
      this.showDeleteAllModal = true;
    },

    async deleteAllEvents() {
      try {
        const response = await fetch('http://localhost:8000/delete_all_schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('일정 삭제에 실패했습니다.');
        }

        const result = await response.json();
        alert(result.message);
        
        // 캘린더 초기화
        this.events = [];
        this.saveEvents();
        await this.loadInsights();
        
        // 모달 닫기
        this.showDeleteAllModal = false;
      } catch (error) {
        console.error('일정 삭제 중 오류:', error);
        alert('일정 삭제 중 오류가 발생했습니다.');
      }
    },

    // 알림 권한 요청
    async requestNotificationPermission() {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('알림 권한이 허용되었습니다.');
        } else {
          console.log('알림 권한이 거부되었습니다.');
        }
      } catch (error) {
        console.error('알림 권한 요청 중 오류:', error);
      }
    },

    // 알림 체크 시작
    startNotificationCheck() {
      // 1분마다 알림 체크
      this.notificationCheckInterval = setInterval(() => {
        this.checkUpcomingEvents();
      }, 60000); // 60000ms = 1분

      // 초기 체크
      this.checkUpcomingEvents();
    },

    // 다가오는 일정 체크
    checkUpcomingEvents() {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60000); // 5분 후

      this.events.forEach(event => {
        const eventStart = new Date(event.start);
        const fiveMinutesBefore = new Date(eventStart.getTime() - 5 * 60000); // 일정 시작 5분 전

        // 알림 키 생성
        const beforeNotificationKey = `before-${event.id}`;
        const startNotificationKey = `start-${event.id}`;

        // 일정 시작 5분 전 알림 (아직 보내지 않은 경우에만)
        if (now >= fiveMinutesBefore && now < eventStart && !this.sentNotifications.has(beforeNotificationKey)) {
          this.showNotification(event, 'before');
          this.sentNotifications.add(beforeNotificationKey);
        }
        // 일정 시작 시간 알림 (아직 보내지 않은 경우에만)
        else if (now >= eventStart && now <= fiveMinutesLater && !this.sentNotifications.has(startNotificationKey)) {
          this.showNotification(event, 'start');
          this.sentNotifications.add(startNotificationKey);
        }
      });

      // 하루가 지난 알림 기록 정리
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      for (const key of this.sentNotifications) {
        const [, eventId] = key.split('-');
        const event = this.events.find(e => e.id === eventId);
        if (event) {
          const eventTime = new Date(event.start);
          if (eventTime < oneDayAgo) {
            this.sentNotifications.delete(key);
          }
        }
      }
    },

    // 알림 표시
    showNotification(event, type) {
      if (Notification.permission === 'granted') {
        let title, body;
        
        if (type === 'before') {
          title = '일정 시작 5분 전';
          body = `${event.content} 일정 시작 5분 전입니다.`;
        } else {
          title = '일정 시작';
          body = `${event.content} 일정 시작 시간입니다.`;
        }

        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          tag: `event-${event.id}-${type}`,
        });

        // 알림 클릭 시 브라우저 창을 최상위로 가져오기
        notification.onclick = () => {
          // 현재 창의 위치와 크기 저장
          const currentLeft = window.screenX;
          const currentTop = window.screenY;
          
          // 창을 현재 위치로 이동 (이렇게 하면 창이 최상위로 올라옴)
          window.moveTo(currentLeft, currentTop);
          
          // 창 활성화
          window.focus();
          window.parent.focus();
          if (window.opener) {
            window.opener.focus();
          }
          
          notification.close();
        };
      }
    },
  },
  computed: {
    groupedTimeSlots() {
      if (!this.weeklySummary || !this.weeklySummary.free_time_slots) {
        return {};
      }

      const grouped = {};
      this.weeklySummary.free_time_slots.forEach(slot => {
        const day = slot.split('요일')[0];
        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(slot);
      });

      return grouped;
    },
    getMostFrequentCategory() {
      if (!this.weeklySummary?.category_summary) return null;
      return Object.entries(this.weeklySummary.category_summary)
        .sort((a, b) => b[1].count - a[1].count)[0][0];
    },
    getLongestCategory() {
      if (!this.weeklySummary?.category_summary) return null;
      return Object.entries(this.weeklySummary.category_summary)
        .sort((a, b) => b[1].total_hours - a[1].total_hours)[0][0];
    },
    getCategoryBalance() {
      if (!this.weeklySummary?.category_summary) return null;
      const categories = Object.keys(this.weeklySummary.category_summary);
      if (categories.length <= 1) return null;
      
      const maxPercentage = Math.max(...categories.map(cat => 
        this.weeklySummary.category_summary[cat].count / this.weeklySummary.total_schedules * 100
      ));
      
      if (maxPercentage > 70) {
        return "일정이 한 카테고리에 너무 집중되어 있습니다. 다른 유형의 일정도 추가해보세요.";
      } else if (maxPercentage < 40) {
        return "일정이 다양한 카테고리에 잘 분산되어 있습니다.";
      }
      return null;
    }
  },
};
</script>

<style>
/* 기본 스타일 */
.calendar-page {
  max-width: 1400px;
  margin: 40px auto;
  padding: 2rem;
  background: #fdfdfd;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.dark-mode {
  background-color: #2c2c2c;
  color: white;
}

.dark-mode .title {
  color: white;
}

.dark-mode .natural-input-form textarea,
.dark-mode .add-event-form input {
  background-color: #444;
  color: white;
  border: 1px solid #555;
}

.dark-mode .natural-input-form button,
.dark-mode .add-event-form button {
  background-color: #444;
  border: none;
}

.dark-mode .modal {
  background-color: #333;
  color: white;
}

.dark-mode .modal input {
  background-color: #444;
  color: white;
  border: 1px solid #555;
}

.dark-mode .modal-buttons button:nth-child(1) {
  background: #3eaf7c;
  color: white;
}

.dark-mode .modal-buttons button:nth-child(2) {
  background: #f44336;
  color: white;
}

.dark-mode .modal-buttons button:nth-child(3) {
  background: #555;
}

/* 다크 모드 토글 버튼 */
.dark-mode-toggle {
  background-color: #444;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.dark-mode-toggle:hover {
  background-color: #555;
}

.title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
}

.natural-input-form {
  margin-bottom: 2rem;
  text-align: center;
}

.natural-input-form textarea {
  width: 90%;
  min-height: 30px;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  resize: vertical;
  font-size: 1rem;
}

.natural-input-form button {
  margin-top: 1rem;
  background-color: #3eaf7c;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.natural-input-form button:hover {
  background-color: #379f6a;
}

.add-event-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.add-event-form input {
  padding: 0.6rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 180px;
}

.add-event-form button {
  background-color: #3eaf7c;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-event-form button:hover {
  background-color: #379f6a;
}

.event-pink {
  background-color: #f48fb1 !important;
  color: black !important;
}
.event-blue {
  background-color: #90caf9 !important;
  color: black !important;
}
.event-green {
  background-color: #a5d6a7 !important;
  color: black !important;
}
.event-purple {
  background-color: #ce93d8 !important;
  color: black !important;
}
.event-orange {
  background-color: #ffcc80 !important;
  color: black !important;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  width: 80%;
  max-width: 600px;
  color: black;
}

.modal input {
  width: 100%;
  padding: 0.6rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.modal-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}

.modal-buttons button {
  background-color: #3eaf7c;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.modal-buttons button:nth-child(2) {
  background-color: #f44336;
}

.modal-buttons button:nth-child(3) {
  background-color: #555;
}

.modal-buttons button:hover {
  background-color: #379f6a;
}

.ai-insights-panel {
  flex: 0 0 400px;
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dark-mode .ai-insights-panel {
  background: #2c2c2c;
  color: white;
}

.insight-section {
  margin-bottom: 1.5rem;
}

.insight-section h3 {
  color: #3eaf7c;
  margin-bottom: 1rem;
}

.free-time-slots, .improvement-suggestions {
  margin-top: 1rem;
}

.suggested-times {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.suggestion-card {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dark-mode .suggestion-card {
  background: #333;
  color: white;
}

.suggestion-card .reason {
  color: #666;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.dark-mode .suggestion-card .reason {
  color: #aaa;
}

.suggestion-card button {
  background: #3eaf7c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.suggestion-card button:hover {
  background: #379f6a;
}

.delete-all-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: background-color 0.3s;
}

.delete-all-button:hover {
  background-color: #c82333;
}

.modal .danger {
  background-color: #dc3545;
  color: white;
}

.modal .danger:hover {
  background-color: #c82333;
}

.time-slots {
  margin-left: 1rem;
  margin-top: 0.5rem;
}

.time-slot {
  display: inline;
  margin-right: 0.5rem;
}

.category-select {
  padding: 0.6rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 180px;
  background-color: white;
}

.dark-mode .category-select {
  background-color: #444;
  color: white;
  border: 1px solid #555;
}

.category-summary {
  margin-top: 1rem;
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.category-stat-item {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dark-mode .category-stat-item {
  background: #333;
  color: white;
}

.category-stat-item h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.category-stat-item p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.category-stat-item.event-blue {
  border-left: 4px solid #90caf9;
}

.category-stat-item.event-green {
  border-left: 4px solid #a5d6a7;
}

.category-stat-item.event-purple {
  border-left: 4px solid #ce93d8;
}

.category-stat-item.event-orange {
  border-left: 4px solid #ffcc80;
}

.category-insights {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.dark-mode .category-insights {
  background: #2c2c2c;
}

.category-insights ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.category-insights li {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #666;
}

.dark-mode .category-insights li {
  color: #aaa;
}

.main-content {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.calendar-section {
  flex: 1;
  min-width: 0;
}

.my-calendar {
  width: 100%;
  height: 700px !important;
}
</style>
