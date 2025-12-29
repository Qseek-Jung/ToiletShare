import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">서비스 이용약관</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">시행일자: 2024년 12월 6일</p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 space-y-8 text-gray-900 dark:text-gray-200">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제1조 (목적)</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            본 약관은 대똥단결(이하 "서비스")이 제공하는 화장실 정보 공유 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제2조 (정의)</h2>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                            <li><strong>"서비스"</strong>란 대똥단결이 제공하는 화장실 위치 정보 공유 및 검색 플랫폼을 의미합니다.</li>
                            <li><strong>"이용자"</strong>란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                            <li><strong>"회원"</strong>이란 서비스에 가입하여 개인정보를 제공하고 계정을 등록한 자를 말합니다.</li>
                            <li><strong>"화장실 정보"</strong>란 위치, 이용 가능 여부, 시설 정보 등 화장실과 관련된 모든 정보를 의미합니다.</li>
                            <li><strong>"크래딧"</strong>이란 서비스 내에서 화장실 정보 등록, 리뷰 작성 등의 활동으로 획득하는 가상 포인트를 말합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제3조 (약관의 효력 및 변경)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 약관의 효력</h3>
                                <p className="text-gray-700 dark:text-gray-300">본 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 약관의 변경</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 약관이 변경될 경우 변경된 약관은 서비스 화면에 공지하고 변경된 약관은 공지 후 7일이 경과한 시점부터 효력이 발생합니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제4조 (서비스의 제공 및 변경)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 서비스 내용</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>화장실 위치 정보 검색 및 지도 표시</li>
                                    <li>화장실 정보 등록 및 수정</li>
                                    <li>화장실 이용 리뷰 작성 및 조회</li>
                                    <li>화장실 이용 가능 여부 신고</li>
                                    <li>북마크 및 즐겨찾기 기능</li>
                                    <li>기타 서비스가 추가 개발하거나 제공하는 서비스</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 서비스 제공 시간</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 점검, 통신장애 등의 사유로 서비스가 일시 중단될 수 있으며, 이 경우 사전에 공지합니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제5조 (회원가입)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 회원가입 방법</h3>
                                <p className="text-gray-700 dark:text-gray-300">이용자는 구글, 네이버, 카카오 등의 소셜 로그인을 통해 회원가입을 할 수 있습니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 회원 정보</h3>
                                <p className="text-gray-700 dark:text-gray-300">회원은 정확한 정보를 제공해야 하며, 허위 정보 제공으로 인한 불이익은 회원 본인이 책임집니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">3. 미성년자 가입</h3>
                                <p className="text-gray-700 dark:text-gray-300">만 14세 미만의 아동은 개인정보보호법에 따라 회원가입이 제한됩니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제6조 (개인정보 보호)</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            서비스는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 관련 법령 및 서비스의 개인정보처리방침이 적용됩니다.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <strong className="text-gray-900 dark:text-white">개인정보처리방침:</strong>
                            <button onClick={() => window.location.hash = '#/privacy'} className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                                바로가기
                            </button>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제7조 (이용자의 의무)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 금지행위</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">이용자는 다음 각 호의 행위를 하여서는 안 됩니다:</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>타인의 개인정보를 도용하는 행위</li>
                                    <li>허위 정보를 등록하거나 타인을 기만하는 행위</li>
                                    <li>서비스의 운영을 방해하는 행위</li>
                                    <li>외설적이거나 폭력적인 메시지, 이미지, 음성 등을 공개 또는 게시하는 행위</li>
                                    <li>타인의 명예를 손상시키거나 불이익을 주는 행위</li>
                                    <li>저작권 등 타인의 권리를 침해하는 행위</li>
                                    <li>관련 법령에 위배되는 행위</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 계정 관리</h3>
                                <p className="text-gray-700 dark:text-gray-300">회원은 자신의 계정을 적절히 관리할 책임이 있으며, 타인에게 계정을 양도하거나 대여할 수 없습니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제8조 (크래딧 제도)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 크래딧 획득</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">회원은 다음의 활동을 통해 크래딧을 획득할 수 있습니다:</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>회원가입: 50 크래딧</li>
                                    <li>화장실 정보 등록: 정책에 따라 차등 지급</li>
                                    <li>리뷰 작성: 정책에 따라 지급</li>
                                    <li>광고 시청: 정책에 따라 지급</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 크래딧 사용</h3>
                                <p className="text-gray-700 dark:text-gray-300">크래딧은 비밀번호가 설정된 화장실 정보 확인 등 서비스 내 기능 이용에 사용될 수 있습니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">3. 크래딧의 환급 불가</h3>
                                <p className="text-gray-700 dark:text-gray-300">크래딧은 현금으로 환급되지 않으며, 서비스 내에서만 사용 가능합니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제9조 (콘텐츠의 관리)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 이용자 게시물</h3>
                                <p className="text-gray-700 dark:text-gray-300">이용자가 서비스에 등록한 화장실 정보, 리뷰 등의 콘텐츠에 대한 책임은 등록한 이용자에게 있습니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 콘텐츠 삭제</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">서비스는 다음의 경우 사전 통지 없이 콘텐츠를 삭제하거나 이동할 수 있습니다:</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>본 약관을 위반한 경우</li>
                                    <li>타인의 권리를 침해하는 경우</li>
                                    <li>관련 법령에 위배되는 경우</li>
                                    <li>공공질서 및 미풍양속에 반하는 경우</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제10조 (서비스 이용의 제한)</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            서비스는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등의 조치를 취할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제11조 (면책조항)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 서비스 제공 중단</h3>
                                <p className="text-gray-700 dark:text-gray-300">서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지, 해킹, 시스템 점검 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 정보의 정확성</h3>
                                <p className="text-gray-700 dark:text-gray-300">서비스는 이용자가 등록한 화장실 정보의 정확성에 대해 보증하지 않으며, 해당 정보의 이용으로 발생한 손해에 대해 책임지지 않습니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">3. 이용자 간 분쟁</h3>
                                <p className="text-gray-700 dark:text-gray-300">서비스는 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁에 대해 책임을 지지 않습니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제12조 (저작권)</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            서비스가 제공하는 콘텐츠에 대한 저작권은 서비스에 귀속됩니다. 이용자는 서비스를 이용함으로써 얻은 정보를 서비스의 사전 승낙 없이 복제, 전송, 출판, 배포, 방송 등의 방법으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제13조 (분쟁 해결)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. 준거법</h3>
                                <p className="text-gray-700 dark:text-gray-300">본 약관의 해석 및 서비스의 이용에 관한 분쟁에 대해서는 대한민국 법령을 적용합니다.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. 관할법원</h3>
                                <p className="text-gray-700 dark:text-gray-300">서비스 이용과 관련하여 발생한 분쟁에 대해 소송이 제기될 경우, 민사소송법상의 관할법원에 제소합니다.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">제14조 (부칙)</h2>
                        <p className="text-gray-700 dark:text-gray-300">본 약관은 2024년 12월 6일부터 시행됩니다.</p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                            <p className="font-bold mb-2">문의사항</p>
                            <p>이메일: qseek77@gmail.com</p>
                            <p>서비스명: 대똥단결</p>
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
