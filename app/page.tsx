'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// --- CALENDÁRIO ---
const DIAS_SEMANA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ⚠️ TROQUE PELO NÚMERO DO WHATSAPP DO BARBEIRO (só números, com DDD)
const WHATSAPP_BARBEIRO = '5511999999999';

// --- CONFIGURAÇÕES DA BARBEARIA BLACK STAR ---
const SERVICOS = [
  { id: 'corte', nome: 'Corte', preco: 45, duracao: 30, desc: 'Corte tesoura/máquina com acabamento de alta precisão.' },
  { id: 'barba', nome: 'Barba', preco: 40, duracao: 30, desc: 'Modelagem completa da barba com toalha quente e navalha.' },
  { id: 'corte-barba', nome: 'Corte + Barba', preco: 80, duracao: 60, desc: 'Combo completo de cabelo e barba com atendimento exclusivo.' }
];

// Grade de funcionamento conforme imagem
const HORARIOS_DIA: Record<number, { inicio: string; fim: string } | null> = {
  0: null, // Domingo: Fechado
  1: null, // Segunda: Fechada
  2: { inicio: '09:30', fim: '19:00' }, // Terça
  3: { inicio: '09:30', fim: '19:00' }, // Quarta
  4: { inicio: '09:30', fim: '19:30' }, // Quinta
  5: { inicio: '09:30', fim: '19:00' }, // Sexta
  6: { inicio: '08:00', fim: '17:00' }  // Sábado
};

export default function Home() {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  // Estado do calendário
  const [calYear, setCalYear] = useState(hoje.getFullYear());
  const [calMonth, setCalMonth] = useState(hoje.getMonth());

  // Estado do formulário
  const [servicoSelecionado, setServicoSelecionado] = useState(SERVICOS[0]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  
  const [agendamentosExistentes, setAgendamentosExistentes] = useState<any[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [dadosComprovante, setDadosComprovante] = useState<any>(null);

  // --- Lógica do Calendário ---
  const primeiroDiaMes = new Date(calYear, calMonth, 1).getDay();
  const diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();
  const celulasVazias = Array.from({ length: primeiroDiaMes });
  const diasDoMes = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  const irMesAnterior = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const irProximoMes = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const selecionarDia = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const dataStr = `${calYear}-${mm}-${dd}`;

    // Verificar se é data passada
    if (dataStr < hojeStr) return;

    // Verificar se dia da semana está fechado (0=Dom, 1=Seg)
    const diaSemana = new Date(dataStr + 'T00:00:00').getDay();
    if (diaSemana === 0 || diaSemana === 1) return;

    setDataSelecionada(dataStr);
    setHorarioInicio('');
  };

  const isDiaSelecionado = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return dataSelecionada === `${calYear}-${mm}-${dd}`;
  };

  const isDiaDesabilitado = (dia: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const dataStr = `${calYear}-${mm}-${dd}`;
    if (dataStr < hojeStr) return true;
    const diaSemana = new Date(dataStr + 'T00:00:00').getDay();
    return diaSemana === 0 || diaSemana === 1;
  };

  const isHojeDia = (dia: number) => {
    return calYear === hoje.getFullYear() && calMonth === hoje.getMonth() && dia === hoje.getDate();
  };

  // Impedir navegar para meses passados
  const podeMesAnterior = calYear > hoje.getFullYear() || calMonth > hoje.getMonth();

  // Buscar agendamentos existentes no Supabase quando selecionar a data
  useEffect(() => {
    if (!dataSelecionada) return;

    async function carregarAgendamentos() {
      setCarregandoHorarios(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select('horario_inicio, horario_fim, servico_duracao')
        .eq('data_agendamento', dataSelecionada);

      if (!error && data) {
        setAgendamentosExistentes(data);
      }
      setCarregandoHorarios(false);
    }

    carregarAgendamentos();
  }, [dataSelecionada]);

  // Converter horário "HH:MM" para minutos desde o início do dia
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Converter minutos para "HH:MM"
  const minutesToTime = (minTotal: number) => {
    const h = Math.floor(minTotal / 60).toString().padStart(2, '0');
    const m = (minTotal % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Gerar slots de horários com base no dia e na duração do serviço
  const gerarHorariosDisponiveis = () => {
    if (!dataSelecionada) return [];

    const dataObj = new Date(dataSelecionada + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const regraDia = HORARIOS_DIA[diaSemana];

    if (!regraDia) return []; // Fechado no dia

    const minInicioDia = timeToMinutes(regraDia.inicio);
    const minFimDia = timeToMinutes(regraDia.fim);
    const duracaoNecessaria = servicoSelecionado.duracao; // 30 ou 60 minutos

    const slots: { horario: string; disponivel: boolean; motivo?: string }[] = [];

    // Mapear os intervalos já ocupados
    const blocosOcupados = agendamentosExistentes.map(a => ({
      inicio: timeToMinutes(a.horario_inicio),
      fim: timeToMinutes(a.horario_fim)
    }));

    // Gerar horários de 30 em 30 minutos
    for (let current = minInicioDia; current + duracaoNecessaria <= minFimDia; current += 30) {
      const slotInicio = current;
      const slotFim = current + duracaoNecessaria;

      // Verificar se o slot colide com algum agendamento já feito
      const conflito = blocosOcupados.some(ocupado => {
        return slotInicio < ocupado.fim && slotFim > ocupado.inicio;
      });

      slots.push({
        horario: minutesToTime(slotInicio),
        disponivel: !conflito
      });
    }

    return slots;
  };

  // Aplica máscara de telefone (XX) XXXXX-XXXX
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setTelefone(value);
  };

  // Envio do formulário e salvamento no Supabase
  const handleConfirmarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horarioInicio || !nome || !telefone || !dataSelecionada) return;

    setEnviando(true);

    const minInicio = timeToMinutes(horarioInicio);
    const minFim = minInicio + servicoSelecionado.duracao;
    const horarioFim = minutesToTime(minFim);

    // Salvar no banco Supabase
    const { data, error } = await supabase
      .from('agendamentos')
      .insert([
        {
          cliente_nome: nome,
          cliente_telefone: telefone,
          servico_id: servicoSelecionado.id,
          servico_nome: servicoSelecionado.nome,
          servico_preco: servicoSelecionado.preco,
          servico_duracao: servicoSelecionado.duracao,
          data_agendamento: dataSelecionada,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim
        }
      ])
      .select();

    setEnviando(false);

    if (error) {
      alert('Erro ao agendar horário: ' + error.message);
      return;
    }

    const dadosFinal = {
      nome,
      telefone,
      servico: servicoSelecionado.nome,
      preco: servicoSelecionado.preco,
      data: dataSelecionada.split('-').reverse().join('/'),
      horario: horarioInicio
    };

    setDadosComprovante(dadosFinal);
    setConcluido(true);
  };

  // Abrir WhatsApp com confirmação formatada
  const abrirWhatsAppComprovante = () => {
    if (!dadosComprovante) return;
    const numLimpo = dadosComprovante.telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(
      `💈 *CONFIRMAÇÃO DE AGENDAMENTO - BLACK STAR* 💈\n\n` +
      `Olá *${dadosComprovante.nome}*!\n` +
      `Seu agendamento foi registrado com sucesso com o barbeiro *Marcelo*:\n\n` +
      `✂️ *Serviço:* ${dadosComprovante.servico} (R$ ${dadosComprovante.preco},00)\n` +
      `📅 *Data:* ${dadosComprovante.data}\n` +
      `⏰ *Horário:* ${dadosComprovante.horario}\n\n` +
      `⚠️ *REGRA DE CANCELAMENTO:* Cancelamentos devem ser feitos com no mínimo *24 horas de antecedência*. Em caso de não comparecimento ou cancelamento fora do prazo, será cobrado *50% do valor do corte*.`
    );

    window.open(`https://wa.me/55${numLimpo}?text=${mensagem}`, '_blank');
  };

  const slotsDisponiveis = gerarHorariosDisponiveis();

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-gray-100 flex flex-col font-sans">
      
      {/* HEADER DA BLACK STAR */}
      <header className="border-b border-[#26262e] bg-[#121215]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Espaço reservado para a sua LOGO */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f3e5ab] flex items-center justify-center text-black font-extrabold shadow-lg shadow-[#d4af37]/20">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-2">
                BLACK STAR <Sparkles className="w-4 h-4 text-[#d4af37]" />
              </h1>
              <p className="text-xs text-gray-400">Barbeiro Marcelo</p>
            </div>
          </div>

          {/* Localizacao */}
          <div className="flex items-center gap-3">
          <a 
            href="https://maps.google.com" 
            target="_blank" 
            rel="noreferrer"
            className="p-2 rounded-lg bg-[#1c1c22] border border-[#2d2d38] text-gray-300 hover:text-[#d4af37] hover:border-[#d4af37] transition"
            title="Endereço"
          >
            <MapPin className="w-4 h-4" />
          </a>
        </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 space-y-8">

        {concluido ? (
          /* TELA DE SUCESSO / COMPROVANTE */
          <div className="bg-[#141418] border border-[#d4af37]/30 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-2xl"></div>
            
            <div className="w-16 h-16 bg-[#d4af37]/10 text-[#d4af37] rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Agendamento Confirmado!</h2>
              <p className="text-gray-400 text-sm mt-1">Horário reservado com o barbeiro Marcelo.</p>
            </div>

            <div className="bg-[#1c1c24] border border-[#2d2d3b] rounded-xl p-4 text-left space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Cliente:</span>
                <span className="font-semibold text-white">{dadosComprovante?.nome}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Serviço:</span>
                <span className="font-semibold text-[#d4af37]">{dadosComprovante?.servico}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Data:</span>
                <span className="font-semibold text-white">{dadosComprovante?.data}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-800">
                <span className="text-gray-400">Horário:</span>
                <span className="font-semibold text-white">{dadosComprovante?.horario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valor Total:</span>
                <span className="font-bold text-lg text-[#d4af37]">R$ {dadosComprovante?.preco},00</span>
              </div>
            </div>

            {/* POLÍTICA DE CANCELAMENTO */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left flex gap-3 text-red-300 text-xs">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-400 mb-0.5">Política de Cancelamento:</strong>
                Cancelamentos devem ser solicitados pelo{' '}
                <a
                  href={`https://wa.me/${WHATSAPP_BARBEIRO}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold text-red-300 hover:text-white"
                >
                  WhatsApp do barbeiro
                </a>{' '}
                com no mínimo <strong>24h de antecedência</strong>. Em caso de não comparecimento ou cancelamento fora do prazo, será cobrado <strong>50% do valor</strong>.
              </div>
            </div>

            <button
              onClick={() => {
                setConcluido(false);
                setHorarioInicio('');
              }}
              className="text-xs text-gray-500 hover:text-gray-300 underline block mx-auto"
            >
              Fazer outro agendamento
            </button>
          </div>
        ) : (
          /* FORMULÁRIO DE AGENDAMENTO */
          <form onSubmit={handleConfirmarAgendamento} className="space-y-6">

            {/* ETAPA 1: ESCOLHER SERVIÇO */}
            <div className="space-y-3">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#d4af37]" /> 1. Escolha o Serviço
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SERVICOS.map((s) => {
                  const selected = servicoSelecionado.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setServicoSelecionado(s);
                        setHorarioInicio(''); // Limpa horário ao trocar serviço
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all relative ${
                        selected
                          ? 'bg-[#1e1b13] border-[#d4af37] shadow-lg shadow-[#d4af37]/10'
                          : 'bg-[#141418] border-[#26262e] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white text-base">{s.nome}</h3>
                        <span className="text-[#d4af37] font-extrabold text-sm">R$ {s.preco}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {s.duracao} minutos
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ETAPA 2: ESCOLHER DATA — Calendário Visual */}
            <div className="space-y-3">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#d4af37]" /> 2. Escolha a Data
                {dataSelecionada && (
                  <span className="ml-auto text-[#d4af37] font-bold text-xs normal-case">
                    {dataSelecionada.split('-').reverse().join('/')}
                  </span>
                )}
              </label>

              <div className="bg-[#141418] border border-[#26262e] rounded-2xl p-4 shadow-inner">
                {/* Navegação mês */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={irMesAnterior}
                    disabled={!podeMesAnterior}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#26262e] text-gray-400 hover:text-white transition disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-white text-sm">
                    {MESES_LABELS[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={irProximoMes}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#26262e] text-gray-400 hover:text-white transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Cabeçalho dias */}
                <div className="grid grid-cols-7 mb-2">
                  {DIAS_SEMANA_LABELS.map((d, i) => (
                    <div
                      key={d}
                      className={`text-center text-[10px] font-semibold py-1 ${
                        i === 0 || i === 1 ? 'text-gray-700' : 'text-gray-500'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grade de dias */}
                <div className="grid grid-cols-7 gap-1">
                  {celulasVazias.map((_, i) => <div key={`ev-${i}`} />)}
                  {diasDoMes.map((dia) => {
                    const desabilitado = isDiaDesabilitado(dia);
                    const selecionado = isDiaSelecionado(dia);
                    const hoje_ = isHojeDia(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        disabled={desabilitado}
                        onClick={() => selecionarDia(dia)}
                        className={`
                          aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition
                          ${
                            desabilitado
                              ? 'text-gray-700 cursor-not-allowed'
                              : selecionado
                              ? 'bg-[#d4af37] text-black font-bold shadow-md shadow-[#d4af37]/30'
                              : hoje_
                              ? 'bg-[#1e1b13] border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37] hover:text-black'
                              : 'hover:bg-[#26262e] text-gray-300'
                          }
                        `}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#26262e] text-[10px] text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#d4af37] inline-block" /> Selecionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#1e1b13] border border-[#d4af37]/40 inline-block" /> Hoje
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-transparent inline-block text-gray-700 text-[9px] font-bold leading-3">✕</span> Fechado
                  </span>
                </div>
              </div>
            </div>

            {/* ETAPA 3: HORÁRIOS DISPONÍVEIS */}
            {dataSelecionada && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#d4af37]" /> 3. Horários Disponíveis
                  </label>
                  <span className="text-xs text-gray-500">
                    {servicoSelecionado.duracao === 60 ? 'Requer 1h livre' : '30 min'}
                  </span>
                </div>

                {carregandoHorarios ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Buscando horários livres...</div>
                ) : slotsDisponiveis.length === 0 ? (
                  <div className="p-6 bg-[#141418] border border-red-500/20 text-red-400 rounded-xl text-center text-sm">
                    A barbearia está fechada ou não há horários suficientes livres nesta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slotsDisponiveis.map((slot) => {
                      const selecionado = horarioInicio === slot.horario;
                      return (
                        <button
                          key={slot.horario}
                          type="button"
                          disabled={!slot.disponivel}
                          onClick={() => setHorarioInicio(slot.horario)}
                          className={`py-3 px-2 rounded-xl text-xs font-semibold transition border ${
                            !slot.disponivel
                              ? 'bg-[#111114] border-gray-900 text-gray-600 line-through cursor-not-allowed'
                              : selecionado
                              ? 'bg-[#d4af37] border-[#d4af37] text-black font-bold shadow-md shadow-[#d4af37]/20'
                              : 'bg-[#141418] border-[#26262e] text-gray-300 hover:border-[#d4af37] hover:text-[#d4af37]'
                          }`}
                        >
                          {slot.horario}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: DADOS DO CLIENTE */}
            {horarioInicio && (
              <div className="space-y-4 bg-[#141418] border border-[#26262e] rounded-xl p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d4af37]">
                  4. Seus Dados de Contato
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Seu Nome Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        placeholder="Ex: João Silva"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-[#1c1c22] border border-[#2d2d38] rounded-xl pl-10 p-3 text-white focus:outline-none focus:border-[#d4af37] text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Seu WhatsApp / Telefone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={telefone}
                        onChange={handleTelefoneChange}
                        className="w-full bg-[#1c1c22] border border-[#2d2d38] rounded-xl pl-10 p-3 text-white focus:outline-none focus:border-[#d4af37] text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* AVISO DA REGRA DE 24 HORAS */}
                <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-2.5 text-xs text-yellow-300/90">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
                  <span>
                    <strong>Importante:</strong> Cancelamentos devem ser solicitados pelo{' '}
                    <a
                      href={`https://wa.me/${WHATSAPP_BARBEIRO}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold text-yellow-300 hover:text-white"
                    >
                      WhatsApp do barbeiro
                    </a>{' '}
                    com no mínimo <strong>24h de antecedência</strong>. Em caso de ausência ou cancelamento fora do prazo, será cobrado <strong>50% do valor</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-gradient-to-r from-[#d4af37] to-[#e2c158] hover:from-[#c29f2f] hover:to-[#d4af37] text-black font-extrabold py-4 rounded-xl shadow-lg shadow-[#d4af37]/20 transition transform active:scale-98 disabled:opacity-50"
                >
                  {enviando ? 'Confirmando no sistema...' : 'CONFIRMAR AGENDAMENTO'}
                </button>
              </div>
            )}

          </form>
        )}

      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-[#1f1f26] bg-[#09090b] py-6 text-center text-xs text-gray-600">
        <p>Black Star Barbearia © {new Date().getFullYear()} — Atendimento com Barbeiro Marcelo</p>
      </footer>

    </div>
  );
}