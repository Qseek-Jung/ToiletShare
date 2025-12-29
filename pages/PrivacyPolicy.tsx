import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">홈으로</span>
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">개인정보처리방침</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">최종 수정일: 2025년 12월 6일</p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 space-y-8 text-gray-900 dark:text-gray-200">
                    <section>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            대똥단결(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.
                            본 개인정보처리방침은 서비스가 수집하는 개인정보의 항목, 수집 및 이용 목적, 보유 및 이용 기간, 파기 절차 등을 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">1. 수집하는 개인정보 항목</h2>
                        <div className="space-y-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">필수 수집 항목</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li><strong>이메일 주소</strong>: 회원 식별 및 서비스 제공</li>
                                    <li><strong>성별</strong>: 맞춤형 화장실 정보 제공</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">자동 수집 항목</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>서비스 이용 기록, 접속 로그</li>
                                    <li>위치 정보 (사용자 동의 시)</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">2. 개인정보의 수집 및 이용 목적</h2>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li>회원 가입 및 관리: 회원 식별, 본인 확인</li>
                            <li>서비스 제공: 화장실 위치 정보 제공, 맞춤형 콘텐츠 제공</li>
                            <li>서비스 개선: 이용 통계 분석, 신규 서비스 개발</li>
                            <li>고객 지원: 문의 응대, 공지사항 전달</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">3. 개인정보의 보유 및 이용 기간</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            서비스는 이용자의 개인정보를 수집 및 이용 목적이 달성된 후에는 지체 없이 파기합니다.
                        </p>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                            <p className="text-gray-800 dark:text-gray-200">
                                <strong>보유 기간:</strong> 회원 탈퇴 시까지<br />
                                <strong>예외:</strong> 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">4. 개인정보의 파기 절차 및 방법</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            서비스는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 지체 없이 해당 개인정보를 파기합니다.
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li><strong>파기 절차:</strong> 보유 기간 만료 후 즉시 파기</li>
                            <li><strong>파기 방법:</strong> 전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">5. 제3자 제공</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                            단, 다음의 경우는 예외로 합니다:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4 mt-3">
                            <li>이용자가 사전에 동의한 경우</li>
                            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">6. 소셜 로그인 서비스</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            서비스는 편리한 회원가입 및 로그인을 위해 다음의 소셜 로그인 서비스를 이용합니다:
                        </p>
                        <div className="space-y-3">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">Google</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">수집 정보: 이메일, 성별</p>
                            </div>
                            <div className="border-l-4 border-green-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">Naver</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">수집 정보: 이메일, 성별</p>
                            </div>
                            <div className="border-l-4 border-yellow-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">Kakao</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">수집 정보: 이메일, 성별</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            각 소셜 로그인 서비스의 개인정보 처리에 대한 자세한 내용은 해당 서비스 제공자의 개인정보처리방침을 참고하시기 바랍니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">7. 이용자의 권리와 행사 방법</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li>개인정보 열람 요구</li>
                            <li>개인정보 정정 요구</li>
                            <li>개인정보 삭제 요구</li>
                            <li>개인정보 처리 정지 요구</li>
                        </ul>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>권리 행사 방법:</strong> 서비스 내 "내 정보" 메뉴 또는 아래 개인정보 보호책임자에게 이메일로 요청
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">8. 개인정보 보호책임자</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                                서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만 처리 및 피해구제 등을 위하여
                                아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                            </p>
                            <div className="space-y-2">
                                <p className="text-gray-900 dark:text-white"><strong>개인정보 보호책임자</strong></p>
                                <p className="text-gray-700 dark:text-gray-300">이메일: <a href="mailto:qseek77@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">qseek77@gmail.com</a></p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">9. 개인정보 처리방침의 변경</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는
                            변경사항 시행 최소 7일 전에 서비스 공지사항을 통해 고지할 것입니다.
                        </p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <p>본 개인정보처리방침은 2025년 12월 6일부터 적용됩니다.</p>
                            <p className="mt-2">문의사항이 있으시면 <a href="mailto:qseek77@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">qseek77@gmail.com</a>으로 연락 주시기 바랍니다.</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}
